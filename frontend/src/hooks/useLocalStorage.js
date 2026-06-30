// ============================================================
// Custom React Hooks
// Reusable hooks for common functionality
// ============================================================
import { useState, useEffect, useCallback } from 'react';
/**
 * useLocalStorage - Persist state to localStorage
 */
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        }
        catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });
    const setValue = (value) => {
        try {
            setStoredValue(value);
            window.localStorage.setItem(key, JSON.stringify(value));
        }
        catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    };
    return [storedValue, setValue];
}
/**
 * useDebounce - Debounce a value
 */
export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}
/**
 * useOnClickOutside - Detect clicks outside an element
 */
export function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}
/**
 * useWindowSize - Track window dimensions
 */
export function useWindowSize() {
    const [size, setSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });
    useEffect(() => {
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return size;
}
/**
 * useMediaQuery - Check if a media query matches
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [matches, query]);
    return matches;
}
/**
 * useIsMobile - Check if device is mobile
 */
export function useIsMobile() {
    return useMediaQuery('(max-width: 768px)');
}
/**
 * useCopyToClipboard - Copy text to clipboard
 */
export function useCopyToClipboard() {
    const [copied, setCopied] = useState(false);
    const copy = useCallback(async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            return true;
        }
        catch (error) {
            console.error('Failed to copy:', error);
            setCopied(false);
            return false;
        }
    }, []);
    return [copy, copied];
}
/**
 * useToggle - Toggle boolean state
 */
export function useToggle(initialValue = false) {
    const [value, setValue] = useState(initialValue);
    const toggle = useCallback(() => setValue(v => !v), []);
    return [value, toggle, setValue];
}
/**
 * usePrevious - Get previous value
 */
export function usePrevious(value) {
    const [current, setCurrent] = useState(value);
    const [previous, setPrevious] = useState(undefined);
    if (value !== current) {
        setPrevious(current);
        setCurrent(value);
    }
    return previous;
}
/**
 * useOnlineStatus - Track online/offline status
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    return isOnline;
}
