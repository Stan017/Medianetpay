// Silencia warnings de RN en el entorno de test (fonts, animations, etc.)
global.console.warn = jest.fn();
