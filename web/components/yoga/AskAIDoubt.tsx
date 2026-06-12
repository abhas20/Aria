"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2, MessageSquare, X } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "model";
  content: string;
}

interface AskAIDoubtProps {
  currentPoseName?: string;
  selectedPlanName?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

export function AskAIDoubt({
  currentPoseName,
  selectedPlanName,
  onOpen,
  onClose,
}: AskAIDoubtProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      content: "Namaste! I'm Aria, your wellness guide. Ask me any doubts about your yoga practice, pose alignment, or how these exercises support PCOS care.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate dynamic suggestions based on current context
  const getSuggestions = () => {
    if (currentPoseName) {
      return [
        `How do I align for ${currentPoseName}?`,
        `PCOS benefits of ${currentPoseName}?`,
        `What if I feel pain in ${currentPoseName}?`,
      ];
    }
    if (selectedPlanName) {
      return [
        `How does the ${selectedPlanName} plan help?`,
        `How often should I practice this?`,
        `Best time of day for this yoga flow?`,
      ];
    }
    return [
      "How does yoga help with PCOS?",
      "Yoga poses to ease period cramps?",
      "Breathing tips to lower stress?",
    ];
  };

  const suggestions = getSuggestions();

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.post("/chat/message", {
        message: userMessage,
        conversation_id: conversationId,
      });

      const data = response.data;
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "model", content: data.reply }]);
      }
      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Sorry, I encountered an issue connecting to the AI helper. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    // Simple parser for standard styling (bold, bullets, disclaimers)
    const lines = text.split("\n");
    return lines.map((line, i) => {
      let formatted = line;

      // Handle bullet points
      const isBullet = line.trim().startsWith("* ") || line.trim().startsWith("- ");
      if (isBullet) {
        formatted = line.trim().substring(2);
      }

      // Handle bold text (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(formatted)) !== null) {
        if (match.index > lastIndex) {
          parts.push(formatted.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-indigo-900">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < formatted.length) {
        parts.push(formatted.substring(lastIndex));
      }

      const content = parts.length > 0 ? parts : formatted;

      if (isBullet) {
        return (
          <li key={i} className="ml-4 list-disc pl-1 mb-1 text-slate-700 leading-relaxed">
            {content}
          </li>
        );
      }

      // Handle Dr. Aria disclaimer
      if (line.includes("Dr. Aria provides general health information")) {
        return (
          <p key={i} className="text-xs text-slate-400 italic mt-4 pt-3 border-t border-slate-100">
            {content}
          </p>
        );
      }

      return (
        <p key={i} className="mb-2 text-slate-700 leading-relaxed">
          {content}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => handleOpenChange(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 transition duration-200"
      >
        <Sparkles className="h-5 w-5 animate-pulse" />
        <span className="font-medium text-sm">Ask Aria AI</span>
      </button>

      {/* Sheet panel */}
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col border-l border-indigo-100/50 bg-[#fafbfe]">
          <SheetHeader className="p-4 bg-gradient-to-r from-rose-50/70 to-indigo-50/70 border-b border-indigo-100/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-rose-400 to-indigo-500 flex items-center justify-center text-white text-lg font-serif">
                A
              </div>
              <div>
                <SheetTitle className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                  Ask Aria Doubt <Sparkles className="h-4 w-4 text-rose-500" />
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  Your personalized PCOS & Yoga AI Guide
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Messages view */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-rose-500 to-indigo-600 text-white rounded-tr-none"
                      : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p className="leading-relaxed">{msg.content}</p>
                  ) : (
                    <div>{parseMarkdown(msg.content)}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-xs flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                  <span className="text-slate-400 text-xs">Aria is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions & Input area */}
          <div className="p-4 bg-white border-t border-indigo-50/80 space-y-3">
            {/* Quick Suggestions */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Suggested doubts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(suggestion)}
                    className="text-left text-xs bg-slate-50 hover:bg-rose-50/50 hover:text-rose-600 border border-slate-100 hover:border-rose-100 text-slate-600 px-3 py-1.5 rounded-xl transition duration-150"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(input);
              }}
              className="flex items-center gap-2 mt-2"
            >
              <Input
                type="text"
                placeholder="Ask about alignment, breathing, or cramps..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400 text-sm h-11"
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl h-11 px-4 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
