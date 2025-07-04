// src/components/EmojiPicker.tsx

const emojis = ["😀", "😂", "😍", "👍", "👋", "❤️", "🔥", "🎉"];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ onSelect }: EmojiPickerProps) => {
  return (
    <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200">
      <div className="grid grid-cols-4 gap-2">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            className="text-2xl hover:bg-gray-100 rounded p-1"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};