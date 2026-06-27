export function safeLoad<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch (error) {
    console.warn(`localStorage "${key}" okunamadı, varsayılana dönülüyor.`, error);
    return fallback;
  }
}

export function safeSave<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`localStorage "${key}" yazılamadı. Veriyi dışa aktarmayı deneyin.`, error);
  }
}
