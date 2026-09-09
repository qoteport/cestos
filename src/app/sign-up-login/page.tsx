import React from 'react';
import LoginForm from './components/LoginForm';
import BrandPanel from './components/BrandPanel';

export default function SignUpLoginPage() {
  return (
    <div className="min-h-screen flex">
      <BrandPanel />
      <LoginForm />
    </div>
  );
}