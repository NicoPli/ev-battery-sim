import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <div className="flex items-center">
      <select 
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'en' | 'de')}
        className="p-2 border border-gray-300 rounded bg-white"
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    </div>
  );
};

export default LanguageSelector; 