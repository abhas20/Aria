"use client"

import React from 'react'
import { useRequireAuth } from '../hooks/useAuth';
import ProfileComp from '@/components/general/ProfileComp';

const ProfilePage = () => {
  const { user, isLoading } = useRequireAuth();

  if (isLoading || !user) return null;

  return <ProfileComp user={user} />;
  
}

export default ProfilePage
