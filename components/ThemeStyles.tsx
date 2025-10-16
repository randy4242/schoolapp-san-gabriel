import React from 'react';
import { theme } from '../styles/theme';

const ThemeStyles: React.FC = () => {
  const generateCssVariables = () => {
    let variables = '';
    const flattenColors = (colors: any, prefix = 'color') => {
      Object.keys(colors).forEach(key => {
        const value = colors[key];
        const newKey = key === 'DEFAULT' ? '' : `-${key.toLowerCase()}`;
        const newPrefix = `${prefix}${newKey}`;
        if (typeof value === 'string') {
          variables += `--${newPrefix}: ${value};\n`;
        } else if (typeof value === 'object' && value !== null) {
          flattenColors(value, newPrefix);
        }
      });
    };
    flattenColors(theme.colors);
    return `:root {\n${variables}}`;
  };

  const cssString = generateCssVariables();

  return <style dangerouslySetInnerHTML={{ __html: cssString }} />;
};

export default ThemeStyles;
