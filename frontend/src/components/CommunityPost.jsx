import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

export const CommunityPost = ({ post, onReply }) => {
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(post.id, replyText);
      setReplyText('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold">
          {post.user.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-gray-800">{post.user}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">{post.region}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">{post.time}</span>
          </div>
          <p className="text-gray-700 leading-relaxed mb-3">{post.content}</p>
          
          {post.tags && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag, index) => (
                <span key={index} className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-sm text-gray-600 hover:text-green-600 flex items-center space-x-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.replies?.length || 0} replies</span>
            </button>
          </div>

          {/* Replies Section */}
          {showReplies && (
            <div className="mt-4 space-y-3">
              {post.replies?.map((reply, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 ml-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-800 text-sm">{reply.user}</span>
                    <span className="text-xs text-gray-500">{reply.time}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{reply.content}</p>
                </div>
              ))}

              {/* Reply Input */}
              <div className="flex space-x-2 mt-3 ml-4">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleReply}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  Reply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};