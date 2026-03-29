import { useMemo, useState } from 'react';
import { Send, Sparkles, Bot, User, Lightbulb } from 'lucide-react';
import { Layout } from '../components/Layout';
import { sendChatMessage } from '../services/routes';


const starterPrompts = [
  'I was displaced and still need to get to work. What should I do first?',
  'My insurance claim is pending. What can I do this week?',
  'I need temporary housing under $1800/month near schools.',
  'I have caregiving responsibilities and need accessible housing options.'
];

const initialMessages = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'I am your Recovery Assistant. Ask me about housing, insurance, school continuity, or financial next steps.'
  }
];

const SECTION_TITLES = [
  'Immediate Actions',
  'Move Decision',
  'Return Timeline',
  'Why This Recommendation',
  'Job Recommendations',
  'Insurance Recommendations'
];

const SECTION_HEADING_MATCHERS = SECTION_TITLES.map((title) => {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    title,
    regex: new RegExp(
      `^(?:#{1,6}\\s*)?(?:\\d+\\)\\s*)?${escaped}(?:\\s+${escaped})?(?:\\s*[:\\-])?\\s*$`,
      'i'
    )
  };
});

function parseStructuredSections(content) {
  if (typeof content !== 'string') return null;

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const headingRows = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || /^your profile$/i.test(line)) continue;
    const matched = SECTION_HEADING_MATCHERS.find((matcher) => matcher.regex.test(line));
    if (matched) headingRows.push({ row: i, title: matched.title });
  }

  if (!headingRows.length) return null;

  const sections = headingRows
    .map((entry, index) => {
      const start = entry.row + 1;
      const end = index < headingRows.length - 1 ? headingRows[index + 1].row : lines.length;
      const body = lines
        .slice(start, end)
        .join('\n')
        .replace(/^[:\-\s]+/, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return {
        key: `${entry.title}-${index}`,
        heading: entry.title,
        body,
      };
    })
    .filter((section) => section.body.length > 0);

  return sections.length ? sections : null;
}

function AssistantMessageContent({ content }) {
  const structuredSections = parseStructuredSections(content);

  if (!structuredSections) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div className="space-y-3">
      {structuredSections.map((section) => (
        <article key={section.key} className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3">
          <h3 className="text-sm font-bold tracking-wide text-emerald-900 uppercase">
            {section.heading}
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-gray-800">{section.body}</p>
        </article>
      ))}
    </div>
  );
}

export default function Chatbot({ userProfile }) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const userPhotoUrl = userProfile?.photoURL || null;
  const userId = userProfile?.uid || null;

  const displayName = useMemo(() => {
    if (userProfile?.name) return userProfile.name;
    if (userProfile?.displayName) return userProfile.displayName;
    return 'there';
  }, [userProfile]);

  const sendMessage = async (text) => {
    const content = text.trim();
    if (!content || isTyping) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (!userId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to send message because your user profile is not loaded yet. Please refresh and try again.'
        }
      ]);
      setIsTyping(false);
      return;
    }

    try {
      const profileContext = {
        name: userProfile?.name || userProfile?.displayName || null,
        state: userProfile?.state || null,
        county: userProfile?.county || null,
        zipCode: userProfile?.zipCode || null,
        hasChildren: Boolean(userProfile?.hasChildren),
        needsHousing: Boolean(userProfile?.needsHousing),
        needsEmployment: Boolean(userProfile?.needsEmployment),
        hasInsurance: Boolean(userProfile?.hasInsurance),
        insuranceType: userProfile?.insuranceType || null,
        insuranceClaimStatus: userProfile?.insuranceClaimStatus || null,
        caregivingNeeds: userProfile?.caregivingNeeds || [],
        fireRadius: userProfile?.fireRadius ?? null,
        fireSeverity: userProfile?.fireSeverity || null,
        fireSeverityScore: userProfile?.fireSeverityScore ?? null,
        housingBudget: userProfile?.housingBudget ?? null,
      };

      const response = await sendChatMessage({
        userId,
        message: content,
        conversationId,
        context: {
          profile: profileContext
        }
      });

      if (response?.conversationId) {
        setConversationId(response.conversationId);
      }

      const replyContent = response?.reply?.content;
      const rankCount = Array.isArray(response?.meta?.ranking?.sorted_ids)
        ? response.meta.ranking.sorted_ids.length
        : 0;
      const parsedReply = (() => {
        if (typeof replyContent !== 'string') return null;
        try {
          return JSON.parse(replyContent);
        } catch {
          return null;
        }
      })();
      const rankedIds = Array.isArray(parsedReply?.sorted_ids) ? parsedReply.sorted_ids : [];
      const fallbackReply = rankedIds.length
        ? `I found ${rankedIds.length} relevant resources. Top matches: ${rankedIds.slice(0, 3).join(', ')}.`
        : 'I could not find matching resources right now. Please try rephrasing your request with location or urgency details.';
      const finalReply = replyContent || fallbackReply;

      setMessages((prev) => [
        ...prev,
        {
          id: response?.reply?.id || `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalReply
        }
      ]);
    } catch (error) {
      console.error('Error sending chat message:', error);
      const backendError = error?.data?.error || error?.message || null;
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: backendError
            ? `Chat request failed: ${backendError}`
            : 'I could not reach the chat service. Please check that the backend is running and try again.'
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <Layout userProfile={userProfile}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-linear-to-r from-emerald-600 to-cyan-600 rounded-2xl shadow-lg p-8 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <Sparkles className="w-7 h-7" />
            <h1 className="text-3xl font-bold">AI Recovery Assistant</h1>
          </div>
          <p className="text-emerald-50 text-lg">
            Welcome, {displayName}. This interface is ready for model integration and supports the full recovery workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 flex items-center space-x-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>Try These Prompts</span>
            </h2>
            <div className="space-y-3">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                Current mode: live backend chat. If provider keys are missing, this panel will show the exact backend error.
              </p>
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-[58vh] min-h-105 flex flex-col">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-linear-to-b from-white to-emerald-50/40">
                {messages.map((message) => {
                  const isAssistant = message.role === 'assistant';
                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${isAssistant ? '' : 'justify-end'}`}
                    >
                      {isAssistant && (
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${
                          isAssistant
                            ? 'bg-white border border-gray-200 text-gray-800'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isAssistant ? <AssistantMessageContent content={message.content} /> : message.content}
                      </div>
                      {!isAssistant && (
                        <div className="w-8 h-8 rounded-full bg-gray-700 text-white flex items-center justify-center shrink-0 overflow-hidden">
                          {userPhotoUrl ? (
                            <img
                              src={userPhotoUrl}
                              alt="Your profile"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-500">
                      Assistant is typing...
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage(input);
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about housing, insurance, school transitions, or recovery timelines..."
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="px-4 py-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
