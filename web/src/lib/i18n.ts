'use client';

import { useEffect, useState } from 'react';

export type Language = 'zh' | 'en';

const STORAGE_KEY = 'exportai_web_language';
const EVENT_NAME = 'exportai-language-change';

function normalizeLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : 'zh';
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>('zh');

  useEffect(() => {
    setLanguageState(normalizeLanguage(localStorage.getItem(STORAGE_KEY)));

    const handleLanguageChange = () => {
      setLanguageState(normalizeLanguage(localStorage.getItem(STORAGE_KEY)));
    };

    window.addEventListener(EVENT_NAME, handleLanguageChange);
    window.addEventListener('storage', handleLanguageChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleLanguageChange);
      window.removeEventListener('storage', handleLanguageChange);
    };
  }, []);

  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  const toggleLanguage = () => setLanguage(language === 'zh' ? 'en' : 'zh');

  return {
    language,
    isChinese: language === 'zh',
    setLanguage,
    toggleLanguage,
  };
}
