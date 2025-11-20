// Dictionary Loader - Loads and manages the Scrabble word dictionary
export class DictionaryLoader {
    constructor() {
        this.dictionary = new Set();
        this.isLoaded = false;
        this.loadingPromise = null;
    }

    // Load dictionary from file
    async loadDictionary() {
        // If already loaded, return immediately
        if (this.isLoaded) {
            return true;
        }

        // If currently loading, return the existing promise
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        // Start loading
        this.loadingPromise = this._loadDictionaryFile();
        return this.loadingPromise;
    }

    async _loadDictionaryFile() {
        try {
            console.log('📚 Loading Scrabble dictionary...');
            const response = await fetch('/assets/dictionary.txt');
            
            if (!response.ok) {
                throw new Error(`Failed to load dictionary: ${response.status}`);
            }

            const text = await response.text();
            
            // Split by lines and add each word to the Set (converting to uppercase for consistency)
            const words = text.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length > 0);
            
            words.forEach(word => {
                this.dictionary.add(word);
            });

            this.isLoaded = true;
            console.log(`✅ Dictionary loaded: ${this.dictionary.size} words`);
            return true;
        } catch (error) {
            console.error('❌ Failed to load dictionary:', error);
            this.isLoaded = false;
            this.loadingPromise = null;
            throw error;
        }
    }

    // Check if a word is valid
    isValidWord(word) {
        if (!this.isLoaded) {
            console.warn('⚠️ Dictionary not loaded yet');
            return false;
        }

        if (!word || word.length < 2) {
            return false;
        }

        // Convert to uppercase and check if it exists in the Set
        return this.dictionary.has(word.toUpperCase());
    }

    // Get dictionary statistics
    getStats() {
        return {
            loaded: this.isLoaded,
            wordCount: this.dictionary.size
        };
    }
}

// Create a singleton instance
export const dictionaryLoader = new DictionaryLoader();
