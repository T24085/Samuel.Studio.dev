import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import {
  assistantChatUrl,
  assistantName,
  assistantSystemPrompt,
  chatLogEndpoint,
  ollamaModelCandidates,
  starterPrompts,
} from '../data/assistant';
import { assets } from '../data/assets';
import { emailAddress } from '../data/site';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  source?: 'ollama' | 'fallback' | 'seed';
  model?: string;
};

type ClientProfile = {
  name: string;
  email: string;
  phone: string;
};

type StoredChatState = {
  sessionId: string;
  messages: ChatMessage[];
  clientProfile?: ClientProfile;
};

const storageKey = 'samuel-studio-assistant-chat';
const assistantRequestTimeoutMs = 60000;

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createGreeting(profile?: ClientProfile): ChatMessage {
  const greetingName = profile?.name?.trim();

  return {
    id: createId(),
    role: 'assistant',
    content: greetingName
      ? `${assistantName} is ready, ${greetingName}. Tell me what kind of business you are building and I will point you to the right package.`
      : `${assistantName} is ready. Tell me what kind of business you are building and I will point you to the right package.`,
    createdAt: Date.now(),
    source: 'seed',
  };
}

function normalizeClientProfile(profile?: Partial<ClientProfile> | null): ClientProfile | null {
  if (!profile) {
    return null;
  }

  const name = typeof profile.name === 'string' ? profile.name.trim() : '';
  const email = typeof profile.email === 'string' ? profile.email.trim() : '';
  const phone = typeof profile.phone === 'string' ? profile.phone.trim() : '';

  if (!name || !email || !phone) {
    return null;
  }

  return { name, email, phone };
}

function loadChatState(): StoredChatState {
  if (typeof window === 'undefined') {
    return {
      sessionId: createId(),
      messages: [createGreeting()],
    };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredChatState>;

      if (typeof parsed.sessionId === 'string' && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        const clientProfile = normalizeClientProfile(parsed.clientProfile as Partial<ClientProfile> | undefined);

        return {
          sessionId: parsed.sessionId,
          messages: parsed.messages,
          clientProfile: clientProfile || undefined,
        };
      }
    }
  } catch {
    // Fall back to a fresh chat session when storage is unavailable or corrupt.
  }

  return {
    sessionId: createId(),
    messages: [createGreeting()],
  };
}

function saveChatState(state: StoredChatState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function buildFallbackReply(userText: string) {
  const query = userText.toLowerCase();

  if (query.includes('nutrition') || query.includes('supplement') || query.includes('supplements') || query.includes('product') || query.includes('products') || query.includes('store') || query.includes('storefront') || query.includes('shop') || query.includes('retail') || query.includes('catalog') || query.includes('e-commerce') || query.includes('ecommerce')) {
    return [
      'Brand / Campaign Website + Online Store. That gives your business a polished front and a clear path to sell.',
      'If the catalog is limited, a Starter Landing Page can open the door cleanly, with SEO and Content Creation to support trust.',
      'Want me to map the pages for you?',
    ].join(' ');
  }

  if (query.includes('church') || query.includes('ministry') || query.includes('faith')) {
    return [
      'Portfolio Website. It gives you room for sermons, events, ministries, and clear contact paths.',
      'If you only need a simple one-page presence, the Starter Landing Page can work too.',
      'Want me to outline the pages?',
    ].join(' ');
  }

  if (
    query.includes('service business') ||
    query.includes('service-based') ||
    query.includes('local business') ||
    query.includes('small business') ||
    query.includes('restaurant') ||
    query.includes('restaurants') ||
    query.includes('cafe') ||
    query.includes('coffee shop') ||
    query.includes('bakery') ||
    query.includes('catering') ||
    query.includes('hotel') ||
    query.includes('venue') ||
    query.includes('event venue') ||
    query.includes('contractor') ||
    query.includes('consultant') ||
    query.includes('consulting') ||
    query.includes('agency') ||
    query.includes('studio') ||
    query.includes('landscaping') ||
    query.includes('lawn care') ||
    query.includes('hvac') ||
    query.includes('plumbing') ||
    query.includes('electrician') ||
    query.includes('roofing') ||
    query.includes('painting') ||
    query.includes('cleaning') ||
    query.includes('salon') ||
    query.includes('salons') ||
    query.includes('spa') ||
    query.includes('barber') ||
    query.includes('photography') ||
    query.includes('photographer') ||
    query.includes('videography') ||
    query.includes('realty') ||
    query.includes('real estate') ||
    query.includes('realtor') ||
    query.includes('broker') ||
    query.includes('brokerage') ||
    query.includes('coach') ||
    query.includes('trainer') ||
    query.includes('clinic') ||
    query.includes('med spa') ||
    query.includes('chiropractor') ||
    query.includes('veterinary') ||
    query.includes('vet') ||
    query.includes('dentist') ||
    query.includes('doctor') ||
    query.includes('lawyer') ||
    query.includes('attorney') ||
    query.includes('law firm') ||
    query.includes('construction') ||
    query.includes('handyman') ||
    query.includes('moving') ||
    query.includes('fitness') ||
    query.includes('gym') ||
    query.includes('gyms')
  ) {
    return [
      'Portfolio Website. It gives you room for services, proof, bookings, menus, locations, and a stronger contact path.',
      'If you want something leaner, the Starter Landing Page is the simpler route.',
      'Want me to outline the pages?',
    ].join(' ');
  }

  if (query.includes('price') || query.includes('pricing') || query.includes('cost')) {
    return [
      'Starter Landing Page starts at $300-$500, Portfolio Website at $600-$1,000, and Brand / Campaign Website starts at $1,000+.',
      'Common add-ons include AI Lead Assistant from $299, SEO from $299, Booking from $249, Online Store from $499, Content Creation from $299, and Care Plan at $49/month.',
    ].join(' ');
  }

  if (query.includes('ai assistant') || query.includes('chat assistant') || query.includes('lead assistant')) {
    return [
      'AI Lead Assistant. It answers questions, captures leads, and points visitors toward the next step.',
      'It starts at $299 and works well for service businesses, consultants, churches, and local brands.',
    ].join(' ');
  }

  if (query.includes('booking') || query.includes('schedule')) {
    return 'Online Booking & Scheduling starts at $249 and lets visitors book appointments or consultations directly from the site with confirmations and reminders.';
  }

  if (query.includes('seo') || query.includes('google')) {
    return 'SEO starts at $299 and covers keyword optimization, meta titles and descriptions, indexing setup, performance improvements, local SEO, and Search Console setup.';
  }

  if (query.includes('store') || query.includes('storefront') || query.includes('shop') || query.includes('retail') || query.includes('catalog') || query.includes('e-commerce') || query.includes('ecommerce')) {
    return 'Online Store / E-Commerce starts at $499 and includes a catalog, shopping cart, secure checkout, payment setup, inventory management, order notifications, and mobile-friendly storefront support.';
  }

  if (query.includes('content') || query.includes('copy') || query.includes('writing')) {
    return 'Content Creation Package. It starts at $299 and covers homepage copy, service page writing, about page content, calls to action, SEO-friendly formatting, and brand messaging support.';
  }

  if (query.includes('care') || query.includes('support') || query.includes('maintenance')) {
    return 'Website Care Plan. It is $49 per month and covers monitoring, security checks, backups, performance reviews, minor content updates, and priority support.';
  }

  if (query.includes('process') || query.includes('how does it work')) {
    return 'The process is Discovery Form, Style Direction, Design & Build, Review & Refine, Launch, and Support. The intake form is the fastest way to start.';
  }

  if (query.includes('intake') || query.includes('form')) {
    return 'For the intake form, send your goals, brand direction, target audience, pages you need, examples you like, timeline, and budget range.';
  }

  if (query.includes('contact') || query.includes('email')) {
    return `You can use the intake form or email ${emailAddress}.`;
  }

  return 'Tell me what kind of business you are building, and I can point you to the right package or add-ons.';
}

function isFallbackMessage(message: ChatMessage) {
  return message.role === 'assistant' && message.content.startsWith('Tell me what kind of site you need');
}

function buildTranscriptMessages(conversation: ChatMessage[]) {
  return conversation
    .filter((message) => !isFallbackMessage(message) && message.source !== 'seed')
    .map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));
}

async function requestAssistantReply(payload: {
  assistant: string;
  sessionId: string;
  pageUrl: string;
  clientProfile: ClientProfile;
  messages: Array<{ role: string; content: string }>;
  userText: string;
}) {
  let lastError: unknown = null;

  for (const model of ollamaModelCandidates) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), assistantRequestTimeoutMs);

    try {
      const response = await fetch(assistantChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          assistant: payload.assistant,
          sessionId: payload.sessionId,
          pageUrl: payload.pageUrl,
          clientProfile: payload.clientProfile,
          systemPrompt: assistantSystemPrompt,
          modelCandidates: ollamaModelCandidates,
          model,
          messages: payload.messages,
        }),
      });

      if (!response.ok) {
        lastError = new Error(`Ollama request failed with status ${response.status}`);
        continue;
      }

      const data = (await response.json()) as { content?: string; model?: string; usedFallback?: boolean };
      const content = data.content?.trim() || '';

      if (content) {
        return {
          content,
          model: data.model?.trim() || model,
          usedFallback: Boolean(data.usedFallback),
        };
      }
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  return {
    content: buildFallbackReply(payload.userText),
    model: 'fallback',
    usedFallback: true,
    error: lastError instanceof Error ? lastError.message : 'Ollama request failed.',
  };
}

async function persistTranscript(payload: {
  sessionId: string;
  pageUrl: string;
  model: string;
  clientProfile: ClientProfile;
  messages: ChatMessage[];
  sendEmail?: boolean;
}) {
  if (!chatLogEndpoint) {
    return;
  }

  const body = JSON.stringify({
    assistant: assistantName,
    sessionId: payload.sessionId,
    pageUrl: payload.pageUrl,
    model: payload.model,
    clientProfile: payload.clientProfile,
    loggedAt: new Date().toISOString(),
    sendEmail: payload.sendEmail ?? false,
    messages: payload.messages,
  });

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const sent = navigator.sendBeacon(chatLogEndpoint, new Blob([body], { type: 'application/json' }));
    if (sent) {
      return;
    }
  }

  await fetch(chatLogEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  });
}

export function ChatAssistant() {
  const initialState = useMemo(() => loadChatState(), []);
  const [sessionId, setSessionId] = useState(initialState.sessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialState.messages);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(initialState.clientProfile ?? null);
  const [intakeDraft, setIntakeDraft] = useState<ClientProfile>({
    name: initialState.clientProfile?.name ?? '',
    email: initialState.clientProfile?.email ?? '',
    phone: initialState.clientProfile?.phone ?? '',
  });
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const intakeNameRef = useRef<HTMLInputElement | null>(null);

  const hasProfile = Boolean(clientProfile);
  const statusLabel = sending ? 'Thinking' : hasProfile ? 'Ready' : 'Need details';
  const modelLabel = hasProfile ? ollamaModelCandidates.join(' / ') : 'Name, email, phone required';

  useEffect(() => {
    saveChatState({
      sessionId,
      messages,
      clientProfile: clientProfile || undefined,
    });
  }, [clientProfile, messages, sessionId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!hasProfile) {
      intakeNameRef.current?.focus();
      return;
    }

    inputRef.current?.focus();
  }, [hasProfile, open]);

  useEffect(() => {
    const node = listRef.current;
    if (!node || !hasProfile) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [hasProfile, messages, open, sending]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const transcriptMessages = useMemo(() => (hasProfile ? messages.slice(-24) : []), [hasProfile, messages]);

  const handleIntakeChange = (field: keyof ClientProfile) => (event: ChangeEvent<HTMLInputElement>) => {
    setIntakeError(null);
    setIntakeDraft((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleIntakeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextProfile = normalizeClientProfile(intakeDraft);

    if (!nextProfile) {
      setIntakeError('Please add your name, email, and phone before starting the chat.');
      return;
    }

    const nextMessages = [createGreeting(nextProfile)];

    setClientProfile(nextProfile);
    setMessages(nextMessages);
    setDraft('');
    setError(null);
    setIntakeError(null);
    setOpen(true);

    saveChatState({
      sessionId,
      messages: nextMessages,
      clientProfile: nextProfile,
    });

    void persistTranscript({
      sessionId,
      pageUrl: window.location.href,
      model: ollamaModelCandidates[0] || 'unknown-model',
      clientProfile: nextProfile,
      messages: nextMessages,
      sendEmail: false,
    }).catch(() => undefined);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const submitMessage = async (messageText: string) => {
    const content = messageText.trim();

    if (!content || sending || !clientProfile) {
      return;
    }

    setError(null);
    setSending(true);

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };

    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setDraft('');

    try {
      const reply = await requestAssistantReply({
        assistant: assistantName,
        sessionId,
        pageUrl: window.location.href,
        clientProfile,
        messages: buildTranscriptMessages(conversation),
        userText: content,
      });

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content:
          reply.content ||
          'I can help with Samuel Studio packages, add-ons, and next steps. Try asking about pricing, timelines, or which service fits your project.',
        createdAt: Date.now(),
        source: reply.usedFallback ? 'fallback' : 'ollama',
        model: reply.model,
      };

      const nextMessages = [...conversation, assistantMessage];
      setMessages(nextMessages);
      void persistTranscript({
        sessionId,
        pageUrl: window.location.href,
        model: reply.model,
        clientProfile,
        messages: nextMessages,
        sendEmail: false,
      }).catch(() => undefined);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'The assistant is temporarily unavailable.';
      setError(message);

      const fallbackMessage: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content:
          'I am having trouble reaching the local model right now. Check that Ollama is running, then try again or ask about Samuel Studio services in a different way.',
        createdAt: Date.now(),
        source: 'fallback',
        model: ollamaModelCandidates[0] || 'unknown-model',
      };

      const nextMessages = [...conversation, fallbackMessage];
      setMessages(nextMessages);
      void persistTranscript({
        sessionId,
        pageUrl: window.location.href,
        model: ollamaModelCandidates[0] || 'unknown-model',
        clientProfile,
        messages: nextMessages,
        sendEmail: false,
      }).catch(() => undefined);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage(draft);
  };

  const handleDraftKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitMessage(draft);
    }
  };

  const handlePrompt = (prompt: string) => {
    if (!clientProfile) {
      return;
    }

    void submitMessage(prompt);
  };

  const handleResetChat = () => {
    const nextSessionId = createId();
    const nextState = {
      sessionId: nextSessionId,
      messages: [createGreeting()],
      clientProfile: undefined,
    };

    setSessionId(nextSessionId);
    setMessages(nextState.messages);
    setClientProfile(null);
    setIntakeDraft({ name: '', email: '', phone: '' });
    setDraft('');
    setError(null);
    setIntakeError(null);
    setShowSuggestions(false);
    setOpen(false);
    saveChatState(nextState);
  };

  return (
    <div className="chat-assistant">
      <button
        className="chat-assistant__launcher"
        type="button"
        aria-expanded={open}
        aria-controls="nova-chat-panel"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close chat with Nova' : 'Chat with Nova'}
      >
        <span className="chat-assistant__launcherAvatar" aria-hidden="true">
          <img src={assets.novaAvatar} alt="" className="chat-assistant__launcherAvatarImage" />
        </span>
        <span className="chat-assistant__launcherText">
          <strong>Chat with Nova</strong>
          <span>Learn more</span>
        </span>
      </button>

      {open ? (
        <section className="chat-assistant__panel" id="nova-chat-panel" aria-label="Website assistant">
          <header className="chat-assistant__header">
            <div className="chat-assistant__titleRow">
              <div className="chat-assistant__avatar" aria-hidden="true">
                <img src={assets.novaAvatar} alt="" className="chat-assistant__avatarImage" />
              </div>
              <div>
                <p className="chat-assistant__eyebrow">Local assistant</p>
                <h2>Nova</h2>
              </div>
            </div>

            <button
              className="chat-assistant__close"
              type="button"
              aria-label="Close chat assistant"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </header>

          <div className="chat-assistant__meta">
            <span>{statusLabel}</span>
            <span>{modelLabel}</span>
          </div>

          {!hasProfile ? (
            <form className="chat-assistant__intake" onSubmit={handleIntakeSubmit}>
              <p className="chat-assistant__intakeIntro">Before we start, tell me who this project is for.</p>
              <p className="chat-assistant__intakeNote">I need a name, email, and phone number so the conversation can be saved and forwarded later if needed.</p>

              <label className="chat-assistant__field">
                <span>Name</span>
                <input
                  ref={intakeNameRef}
                  type="text"
                  value={intakeDraft.name}
                  onChange={handleIntakeChange('name')}
                  placeholder="Client name"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="chat-assistant__field">
                <span>Email</span>
                <input
                  type="email"
                  value={intakeDraft.email}
                  onChange={handleIntakeChange('email')}
                  placeholder="client@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="chat-assistant__field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={intakeDraft.phone}
                  onChange={handleIntakeChange('phone')}
                  placeholder="(555) 123-4567"
                  autoComplete="tel"
                  required
                />
              </label>

              <div className="chat-assistant__footer chat-assistant__footer--stacked">
                <p>{intakeError || 'Once you submit this, Nova will be able to use your details as session context.'}</p>
                <div className="chat-assistant__footerActions">
                  <button className="button button--ghost button--small chat-assistant__reset" type="button" onClick={handleResetChat} disabled={sending}>
                    Reset
                  </button>
                  <button className="button button--primary button--small chat-assistant__send" type="submit" disabled={sending}>
                    <Send size={15} />
                    Start chat
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="chat-assistant__messages" ref={listRef} role="log" aria-live="polite" aria-relevant="additions text">
                {transcriptMessages.map((message) => (
                  <article
                    key={message.id}
                    className={message.role === 'user' ? 'chat-assistant__message chat-assistant__message--user' : 'chat-assistant__message chat-assistant__message--assistant'}
                  >
                    <div className="chat-assistant__bubble">
                      {message.role === 'assistant' ? (
                        <div className="chat-assistant__bubble-meta">
                          <span>{message.source === 'ollama' ? `Ollama${message.model ? ` · ${message.model}` : ''}` : message.source === 'fallback' ? 'Fallback' : 'Nova'}</span>
                        </div>
                      ) : null}
                      {message.content}
                    </div>
                  </article>
                ))}
                {sending ? (
                  <article className="chat-assistant__message chat-assistant__message--assistant chat-assistant__message--thinking" aria-live="polite" aria-atomic="true">
                    <div className="chat-assistant__bubble chat-assistant__bubble--thinking">
                      <div className="chat-assistant__bubble-meta">
                        <span>Nova is thinking</span>
                      </div>
                      <span className="chat-assistant__typing" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </article>
                ) : null}
              </div>

              <div className="chat-assistant__suggestions">
                <button
                  type="button"
                  className="chat-assistant__suggestionsToggle"
                  aria-expanded={showSuggestions}
                  aria-controls="nova-suggested-prompts"
                  onClick={() => setShowSuggestions((value) => !value)}
                  disabled={sending}
                >
                  <span>Suggested questions</span>
                  <span>{showSuggestions ? 'Hide' : 'Show'}</span>
                </button>

                {showSuggestions ? (
                  <div className="chat-assistant__suggestionsList" id="nova-suggested-prompts" aria-label="Suggested questions">
                    {starterPrompts.map((prompt, index) => (
                      <button
                        key={prompt}
                        type="button"
                        className="chat-assistant__chip"
                        onClick={() => handlePrompt(prompt)}
                        disabled={sending}
                        data-priority={index < 2 ? 'high' : 'low'}
                      >
                        <Sparkles size={13} />
                        <span>{prompt}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <form className="chat-assistant__composer" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="nova-chat-input">
                  Message Nova
                </label>
                <textarea
                  id="nova-chat-input"
                  ref={inputRef}
                  className="chat-assistant__input"
                  value={draft}
                  rows={3}
                  placeholder="Ask about pricing, packages, or what you need..."
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleDraftKeyDown}
                />

                <div className="chat-assistant__footer">
                  <p>{error || 'Transcript is saved server-side and can be forwarded to Nova later.'}</p>
                  <div className="chat-assistant__footerActions">
                    <button className="button button--ghost button--small chat-assistant__reset" type="button" onClick={handleResetChat} disabled={sending}>
                      Reset
                    </button>
                    <button className="button button--primary button--small chat-assistant__send" type="submit" disabled={sending}>
                      <Send size={15} />
                      {sending ? 'Sending' : 'Send'}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
