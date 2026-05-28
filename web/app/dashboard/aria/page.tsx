"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

import {
  useChatStore,
  mapMessage,
  mapConversation,
  type Message,
} from "@/store/chatStore";
import { useRequireAuth } from "@/app/hooks/useAuth";
import MessageBubble from "@/components/chat_ui/MessageBubble";
import TypingIndicator from "@/components/chat_ui/TypingIndicator";


export default function AriaPage() {
  const { user, isLoading: authLoading } = useRequireAuth();

  // ── Zustand ───────────────────────────────────────────────────────────────
  const {
    conversations,
    activeConversationId,
    isLoading,
    pendingMessage,
    setConversations,
    setActiveConversation,
    addMessage,
    upsertConversation,
    deleteConversation,
    setLoading,
    setPendingMessage,
    clearPendingMessage,
  } = useChatStore();

  // ── Local UI state ─────────────────
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [typing, setTyping]               = useState(false);
  const [error, setError]                 = useState("");
  const [language, setLanguage]           = useState<"en" | "hi">("en");
  const [listening, setListening]         = useState(false);
  const [voiceOutput, setVoiceOutput]     = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);


  // input comes from pendingMessage store so it survives errors
  const [input, setInput] = useState(pendingMessage);

  const recognitionRef = useRef<any>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  // Get messages for the active conversation directly from the store
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );
  const messages = activeConversation?.messages ?? [];

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user?.preferredLanguage) setLanguage(user.preferredLanguage as "en" | "hi");
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Only fetch if store is empty — avoids refetch on every route visit
    if (conversations.length === 0) {
      loadConversations();
    } else {
      setLoadingConvos(false);
    }
  }, [user]);

  // Sync input with pendingMessage on mount (recover from a failed send)
  useEffect(() => {
    if (pendingMessage) setInput(pendingMessage);
  }, []);

  // ── API calls ─────────────────────────────────────────────────────────────

  async function loadConversations() {
    setLoadingConvos(true);
    try {
      const res = await api.get<any[]>("/chat/conversations");
      setConversations(res.data.map(mapConversation));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConvos(false);
    }
  }

  async function loadConversation(id: string) {
    if (id === activeConversationId) { setSidebarOpen(false); return; }

    // If messages already loaded in store, just switch — no API call
    const existing = conversations.find((c) => c.id === id);
    if (existing && existing.messages.length > 0) {
      setActiveConversation(id);
      setSidebarOpen(false);
      return;
    }

    setActiveConversation(id);
    setSidebarOpen(false);
    setLoadingMsgs(true);

    try {
      const res = await api.get<any>(`/chat/conversations/${id}`);
      // upsertConversation merges messages into the existing store entry
      upsertConversation(mapConversation(res.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  }

  function startNewChat() {
    setActiveConversation(null);
    setError("");
    setSidebarOpen(false);
    clearPendingMessage();
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await api.delete(`/chat/conversations/${id}`);
      deleteConversation(id); // also clears activeConversationId if needed
    } catch (err) {
      console.error(err);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;
    setError("");

    // Save to store in case the request fails
    setPendingMessage(text);

    // Optimistic user bubble — add directly to store
    const optimisticMsg: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      language,
      createdAt: new Date().toISOString(),
    };

    // If new chat, create a temporary conversation in the store so the
    // bubble appears immediately before we know the real conversation_id
    const tempConvoId = activeConversationId ?? `tmp-convo-${Date.now()}`;
    if (!activeConversationId) {
      upsertConversation({
        id: tempConvoId,
        title: text.slice(0, 80),
        createdAt: new Date().toISOString(),
        messages: [optimisticMsg],
      });
      setActiveConversation(tempConvoId);
    } else {
      addMessage(activeConversationId, optimisticMsg);
    }

    setInput("");
    setLoading(true);
    setTyping(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await api.post<{ conversation_id: string; reply: string }>(
        "/chat/message",
        {
          message: text,
          // Send null for new chats (backend creates the conversation)
          conversation_id: activeConversationId?.startsWith("tmp-") 
            ? null 
            : activeConversationId,
          language,
        }
      );

      const realId = res.data.conversation_id;

      // Replace the temp conversation with the real one from the backend
      if (tempConvoId !== realId) {
        // Remove temp entry, add real one with both messages
        const tempConvo = conversations.find((c) => c.id === tempConvoId);
        upsertConversation({
          id: realId,
          title: text.slice(0, 80),
          createdAt: new Date().toISOString(),
          messages: tempConvo?.messages ?? [optimisticMsg],
        });
        // Clean up the temp entry
        deleteConversation(tempConvoId);
        setActiveConversation(realId);
      }

      // Add Aria's reply to the store
      const ariaMsg: Message = {
        id: `aria-${Date.now()}`,
        role: "model",
        content: res.data.reply,
        language,
        createdAt: new Date().toISOString(),
      };
      addMessage(realId, ariaMsg);

      clearPendingMessage();
      if (voiceOutput) speak(res.data.reply);
    } catch {
      // Remove optimistic message and restore input
      setError("Couldn't reach Aria. Please try again.");
      setInput(text); // pendingMessage still has it, but also restore the input
      const targetId = activeConversationId ?? tempConvoId;
      const convo = conversations.find((c) => c.id === targetId);
      if (convo) {
        upsertConversation({
          ...convo,
          messages: convo.messages.filter((m) => m.id !== optimisticMsg.id),
        });
      }
    } finally {
      setLoading(false);
      setTyping(false);
    }
  }

  // ── Auto scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── Input handlers ────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // -- Voice input/output handlers ─────────────────────────────────────────────    
  async function toggleListening() {
    // If already listening, stop the recording
    if (listening && mediaRecorder) {
      mediaRecorder.stop();
      setListening(false);
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      // Collect audio data as the user speaks
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      // When recording stops, send the audio to our backend
      recorder.onstop = async () => {
        // Release the microphone stream
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob);

        try {
          setTyping(true);

          const res = await api.post("/chat/stt" , formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            }
          })

          const data = await res.data;

          if (data.text) {
            setInput(data.text);
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
              textareaRef.current.style.height =
                Math.min(textareaRef.current.scrollHeight, 128) + "px";
            }
          } else {
            setError("Could not understand the audio.");
          }
        } catch (err) {
          setError("Network error while transcribing audio.");
        } finally {
          setTyping(false);
        }
      };

      // Start recording
      recorder.start();
      setMediaRecorder(recorder);
      setListening(true);
      setError(""); // Clear any previous errors
    } catch (err) {
      console.error("Mic access denied or error:", err);
      setError("Please allow microphone access in your browser.");
    }
  }

  function speak(text: string) {
    const clean = text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/---/g, "");
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.93;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() { window.speechSynthesis.cancel(); }

  if (authLoading || !user) return null;


  const ConversationSidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 shrink-0">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          <span>✦</span> New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {loadingConvos ? (
          <div className="space-y-2 px-3 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-gray-300">No chats yet</p>
            <p className="text-xs text-gray-300 mt-1">Start a conversation above</p>
          </div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              className={`group mx-2 mb-0.5 flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                activeConversationId === c.id
                  ? "bg-rose-50 text-rose-700"
                  : "hover:bg-gray-50 text-gray-600"
              }`}
            >
              <span className="text-sm shrink-0">
                {activeConversationId === c.id ? "🌸" : "💬"}
              </span>
              <p className="flex-1 text-xs font-medium truncate">
                {c.title || "New conversation"}
              </p>
              <button
                onClick={(e) => handleDeleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-sm px-1 shrink-0"
                title="Delete conversation"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0">
        <p className="text-[10px] text-gray-300 text-center leading-relaxed">
          General health information only — not medical advice.
        </p>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // Negative margin breaks out of the dashboard page padding to go full-height
    <div className="flex h-[calc(100vh-3.5rem)] -m-4 md:-m-6 overflow-hidden">
      {/* ── Desktop sidebar ────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-100 bg-white shrink-0">
        {ConversationSidebar}
      </aside>

      {/* ── Mobile drawer ──────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-sm font-semibold text-gray-700">
                Conversations
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ✕
              </button>
            </div>
            {ConversationSidebar}
          </div>
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#faf8f5] min-w-0">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile: open sidebar button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">
              ☰
            </button>

            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-base shrink-0">
              🌸
            </div>
            <div>
              <p
                className="text-sm font-semibold text-gray-800"
                style={{ fontFamily: "'DM Serif Display', serif" }}>
                Dr. Aria
              </p>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                AI health companion · Available 24/7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center bg-gray-100 rounded-full p-0.5">
              {(["en", "hi"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    language === lang
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}>
                  {lang === "en" ? "EN" : "हि"}
                </button>
              ))}
            </div>

            {/* Voice output toggle */}
            <button
              onClick={() => {
                setVoiceOutput((v) => !v);
                if (voiceOutput) stopSpeaking();
              }}
              className={`p-1.5 rounded-full transition-all ${
                voiceOutput
                  ? "text-rose-500 bg-rose-50 ring-1 ring-rose-200"
                  : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
              }`}
              title={
                voiceOutput
                  ? "Voice on — click to mute Aria"
                  : "Click to let Aria speak"
              }>
              🔊
            </button>
          </div>
        </div>

        {/* ── Messages ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 min-h-0">
          {loadingMsgs ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full text-center pb-16">
              <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl mb-5">
                🌸
              </div>
              <h2
                className="text-xl font-semibold text-gray-700 mb-2"
                style={{ fontFamily: "'DM Serif Display', serif" }}>
                {language === "hi"
                  ? "नमस्ते, मैं Dr. Aria हूँ"
                  : "Hi, I'm Dr. Aria"}
              </h2>
              <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
                {language === "hi"
                  ? "PCOS, मानसिक स्वास्थ्य, रजोनिवृत्ति — कुछ भी पूछें।"
                  : "Ask me about PCOS, mental wellness, menopause, symptoms, or anything on your mind."}
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {(language === "hi"
                  ? [
                      "मेरे पीरियड्स अनियमित हैं",
                      "PCOS में क्या खाना चाहिए?",
                      "मुझे आज बहुत चिंता हो रही है",
                    ]
                  : [
                      "I've been having irregular periods lately",
                      "What foods help with PCOS symptoms?",
                      "I've been feeling very anxious and tired",
                    ]
                ).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      textareaRef.current?.focus();
                    }}
                    className="text-left text-sm text-gray-500 border border-gray-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 rounded-xl px-4 py-2.5 transition-all">
                    {s} →
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onSpeak={
                    msg.role === "model" ? () => speak(msg.content) : undefined
                  }
                />
              ))}
              {typing && <TypingIndicator />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* ── Input bar ────────────────────────────────────────────────── */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 md:px-6 py-3">
          {error && (
            <p className="text-xs text-red-400 bg-red-50 rounded-lg px-3 py-2 mb-2 text-center">
              {error}
            </p>
          )}

          <div
            className={`flex items-end gap-2 rounded-2xl border px-3 py-2 transition-colors ${
              listening
                ? "border-rose-300 bg-rose-50/40"
                : "border-gray-200 bg-gray-50 focus-within:border-rose-200 focus-within:bg-white"
            }`}>
            {/* Mic */}
            <button
              type="button"
              onClick={toggleListening}
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                listening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-gray-400 hover:text-rose-500 hover:bg-rose-50"
              }`}
              title={listening ? "Listening — tap to stop" : "Tap to speak"}>
              🎤
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={
                listening
                  ? language === "hi"
                    ? "सुन रही हूँ…"
                    : "Listening…"
                  : input
              }
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                language === "hi"
                  ? "Aria से कुछ भी पूछें…"
                  : "Ask Aria anything…"
              }
              disabled={listening || isLoading}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-300 resize-none outline-none py-1 max-h-32 leading-relaxed disabled:opacity-60"
            />

            {/* Send */}
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || listening}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-rose-500 hover:bg-rose-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all">
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              )}
            </button>
          </div>

          <p className="text-[10px] text-gray-300 text-center mt-1.5">
            {listening
              ? language === "hi"
                ? "🎤 बोलिए…"
                : "🎤 Speak now — tap mic to stop"
              : "Enter to send · Shift+Enter for new line"}
          </p>
        </div>
      </div>
    </div>
  );

}