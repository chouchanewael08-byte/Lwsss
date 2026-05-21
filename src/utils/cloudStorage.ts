/**
 * CloudStorage utility wrapper with localStorage fallback for Telegram WebApp environment.
 */

// Simple asynchronous storage interface mimicking Telegram's async WebApp CloudStorage
export interface ICloudStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<boolean>;
  removeItem(key: string): Promise<boolean>;
}

class SafeCloudStorage implements ICloudStorage {
  private get telegramStorage() {
    return (window as any).Telegram?.WebApp?.CloudStorage;
  }

  async getItem(key: string): Promise<string | null> {
    const tg = this.telegramStorage;
    if (tg) {
      return new Promise((resolve) => {
        try {
          tg.getItem(key, (error: any, result: string | null) => {
            if (error) {
              console.error(`Telegram CloudStorage error reading key ${key}:`, error);
              // Fallback to localStorage on error
              resolve(localStorage.getItem(key));
            } else {
              resolve(result);
            }
          });
        } catch (e) {
          console.error("Failed to fetch from Telegram WebApp CloudStorage, trying localStorage fallback:", e);
          resolve(localStorage.getItem(key));
        }
      });
    }
    return Promise.resolve(localStorage.getItem(key));
  }

  async setItem(key: string, value: string): Promise<boolean> {
    const tg = this.telegramStorage;
    // Always sync with localStorage for quick local synchronous caching and reliability
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("Local storage setItem failed:", e);
    }

    if (tg) {
      return new Promise((resolve) => {
        try {
          tg.setItem(key, value, (error: any, success: boolean) => {
            if (error) {
              console.error(`Telegram CloudStorage error writing key ${key}:`, error);
              resolve(false);
            } else {
              resolve(success !== false);
            }
          });
        } catch (e) {
          console.error("Failed to save to Telegram WebApp CloudStorage:", e);
          resolve(false);
        }
      });
    }
    return Promise.resolve(true);
  }

  async removeItem(key: string): Promise<boolean> {
    const tg = this.telegramStorage;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Local storage removeItem failed:", e);
    }

    if (tg) {
      return new Promise((resolve) => {
        try {
          tg.removeItem(key, (error: any, success: boolean) => {
            if (error) {
              console.error(`Telegram CloudStorage error deleting key ${key}:`, error);
              resolve(false);
            } else {
              resolve(success !== false);
            }
          });
        } catch (e) {
          console.error("Failed to remove from Telegram WebApp CloudStorage:", e);
          resolve(false);
        }
      });
    }
    return Promise.resolve(true);
  }
}

export const cloudStorage = new SafeCloudStorage();
