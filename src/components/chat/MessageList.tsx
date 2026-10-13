import { members } from "@/data/chatData";
import type { Message } from "@/types/chat";

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="message-list">
      {messages.map((message) => {
        const author = members.find(
          (member) => member.id === message.authorId,
        )!;
        return (
          <article
            className="chat-message"
            key={message.id}
            id={`message-${message.id}`}
          >
            <div className="member-avatar" style={{ background: author.color }}>
              {author.initials}
            </div>
            <div className="message-content">
              <div className="message-byline">
                <strong>{author.name}</strong>
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <p>{message.body}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
