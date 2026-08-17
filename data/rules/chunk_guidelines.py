import json
import re
from pathlib import Path
from typing import List, Dict

def extract_text_from_document(filepath: str) -> str:
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Document {filepath} not found.")
    
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def chunk_text_semantically(text: str, max_words: int = 200, overlap_sentences: int = 2) -> List[str]:
    """
    Semantic chunking: Splits text by sentences so legal clauses are never cut in half.
    Groups sentences together until the chunk hits the `max_words` limit.
    Overlaps by `overlap_sentences` to ensure context flows into the next chunk.
    """
    # Clean text
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split by sentence boundaries (periods, question marks, exclamation points followed by a space)
    # The regex keeps the punctuation with the sentence.
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    chunks = []
    current_chunk_sentences = []
    current_word_count = 0
    
    i = 0
    while i < len(sentences):
        sentence = sentences[i]
        sentence_word_count = len(sentence.split())
        
        # If adding this sentence pushes us over the limit (and we already have at least one sentence)
        if current_word_count + sentence_word_count > max_words and len(current_chunk_sentences) > 0:
            # Save the current chunk
            chunks.append(' '.join(current_chunk_sentences))
            
            # Start the new chunk using the last few sentences from the previous chunk for overlap
            overlap_start_idx = max(0, len(current_chunk_sentences) - overlap_sentences)
            current_chunk_sentences = current_chunk_sentences[overlap_start_idx:]
            current_word_count = sum(len(s.split()) for s in current_chunk_sentences)
            
            # Note: We do NOT increment 'i' here, because the current sentence still needs to be added
            # to this newly started chunk on the next iteration.
        else:
            current_chunk_sentences.append(sentence)
            current_word_count += sentence_word_count
            i += 1
            
    # Add the final chunk if anything is leftover
    if current_chunk_sentences:
        chunks.append(' '.join(current_chunk_sentences))
        
    return chunks

if __name__ == "__main__":
    # Realistic mock guidelines text for demonstration
    sample_text = (
        "1. Similar Titles: No title shall be approved if it is identical or closely similar to an existing registered title. "
        "2. Government Symbols: Titles must not contain words like Police, Government, CID, or Army, as this may mislead the public. "
        "3. Profanity: Any title containing obscene, vulgar, or offensive language will be strictly rejected under Section 4. "
        "4. Matrimonial Ads: Periodicals exclusively dedicated to matrimonial advertisements or classifieds are not permissible. "
        "5. Foreign Entities: Titles representing foreign embassies or foreign state-sponsored media require special clearance."
    )
    
    # Very small limit to force it to chunk quickly for demonstration
    print("Semantic chunking realistic sample text...")
    chunks = chunk_text_semantically(sample_text, max_words=20, overlap_sentences=1)
    
    for i, chunk in enumerate(chunks):
        print(f"\n--- Chunk {i+1} ---")
        print(chunk)
    
    # Save realistic dummy data
    with open('rules/guideline_chunks.json', 'w') as f:
        json.dump([{"chunk_id": i, "text": c} for i, c in enumerate(chunks)], f, indent=2)
    
    print("\nSaved semantic chunks to rules/guideline_chunks.json")
