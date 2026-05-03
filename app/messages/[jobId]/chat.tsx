'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Message, Profile } from '@/lib/supabase/types'

type MessageRow = Omit<Message, 'sender'> & {
  sender: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
}

interface Props {
  jobId: string
  currentUserId: string
  initialMessages: MessageRow[]
  /** Whether the current user can send messages (job must be accepted/in_progress/completed) */
  canChat: boolean
}

export default function Chat({ jobId, currentUserId, initialMessages, canChat }: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Scroll to bottom on mount and when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    channelRef.current = supabase
      .channel(`messages-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message

          // Avoid duplicating our own optimistic messages
          // Toast for messages from the other party
          if (newMsg.sender_id !== currentUserId) {
            toast.info('New message received', { duration: 3000 })
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev

            // We don't have the sender join from Realtime — fetch it
            supabase
              .from('profiles')
              .select('id, name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data }) => {
                const enriched: MessageRow = {
                  ...newMsg,
                  sender: data ?? null,
                }
                setMessages((p) => {
                  // Remove the optimistic placeholder (same content + same sender)
                  const withoutOptimistic = p.filter(
                    (m) =>
                      !(
                        m.id.startsWith('optimistic-') &&
                        m.sender_id === newMsg.sender_id &&
                        m.content === newMsg.content
                      )
                  )
                  if (withoutOptimistic.some((m) => m.id === newMsg.id)) return withoutOptimistic
                  return [...withoutOptimistic, enriched]
                })
              })
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [supabase, jobId])

  function handleSend() {
    const content = text.trim()
    if (!content) return

    setText('')

    startTransition(async () => {
      // Optimistic insert
      const optimistic: MessageRow = {
        id: `optimistic-${Date.now()}`,
        job_id: jobId,
        sender_id: currentUserId,
        content,
        created_at: new Date().toISOString(),
        sender: null,
      }
      setMessages((prev) => [...prev, optimistic])

      const { error } = await supabase.from('messages').insert({
        job_id: jobId,
        sender_id: currentUserId,
        content,
      })

      if (error) {
        toast.error('Failed to send message')
        // Roll back optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
        setText(content)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Message thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            No messages yet. Say hello 👋
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar (only for other person) */}
              {!isMe && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">
                    {msg.sender?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  isMe
                    ? 'bg-orange-600 text-white rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                } ${msg.id.startsWith('optimistic-') ? 'opacity-60' : ''}`}
              >
                {!isMe && msg.sender?.name && (
                  <p className="text-xs font-semibold mb-0.5 text-muted-foreground">
                    {msg.sender.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    isMe ? 'text-orange-200' : 'text-muted-foreground'
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canChat ? (
        <div className="pt-4 border-t flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={2}
            maxLength={2000}
            className="resize-none flex-1"
            disabled={isPending}
          />
          <Button
            onClick={handleSend}
            disabled={isPending || !text.trim()}
            className="bg-orange-600 hover:bg-orange-700 shrink-0"
          >
            Send
          </Button>
        </div>
      ) : (
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center py-2">
            Chat is available once a bid is accepted.
          </p>
        </div>
      )}
    </div>
  )
}
