import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'

import { cn } from '@/lib/utils'

function Conversation({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="conversation"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  )
}

type BubbleVariant = 'default' | 'ghost'

const BUBBLE_BASE =
  'group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full'

const BUBBLE_VARIANTS: Record<BubbleVariant, string> = {
  default:
    '*:data-[slot=conversation-content]:bg-bubble-sent *:data-[slot=conversation-content]:text-bubble-sent-foreground [&>[data-slot=conversation-content]:is(button,a):hover]:bg-bubble-sent-hover',
  ghost:
    'border-none *:data-[slot=conversation-content]:rounded-none *:data-[slot=conversation-content]:bg-transparent *:data-[slot=conversation-content]:p-0 [&>[data-slot=conversation-content]:is(button,a):hover]:bg-muted [&>[data-slot=conversation-content]:is(button,a):hover]:text-fg dark:[&>[data-slot=conversation-content]:is(button,a):hover]:bg-muted/50',
}

function ConversationBubble({
  variant = 'default',
  align = 'start',
  sentAt,
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<'div'> & {
  variant?: BubbleVariant
  align?: 'start' | 'end'
  sentAt?: React.ReactNode
}) {
  const [revealed, setRevealed] = React.useState(false)

  return (
    <div
      data-slot="conversation-bubble"
      data-variant={variant}
      data-align={align}
      data-revealed={sentAt && revealed ? '' : undefined}
      className={cn(BUBBLE_BASE, BUBBLE_VARIANTS[variant], sentAt ? 'cursor-pointer' : undefined, className)}
      onClick={(event) => {
        onClick?.(event)
        if (!sentAt) return

        if ((event.target as Element).closest('a,button,[role="button"]')) return
        setRevealed((open) => !open)
      }}
      {...props}
    >
      {children}
      {sentAt ? (

        <div
          data-slot="conversation-time"
          className="-mt-1 grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-data-revealed/bubble:grid-rows-[1fr] motion-reduce:transition-none"
        >
          <div className="min-h-0 overflow-hidden">
            <time className="block px-3.5 pt-1 text-xs font-medium text-muted-foreground group-data-[align=end]/bubble:text-end">
              {sentAt}
            </time>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ConversationContent({ className, render, ...props }: useRender.ComponentProps<'div'>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          'relative w-fit max-w-full min-w-0 rounded-[18px] border border-transparent px-3.5 py-2 text-sm leading-snug wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-start [button,a]:transition-ring [button,a]:outline-none [button,a]:focus-visible:border-lime [button,a]:focus-visible:ring-3 [button,a]:focus-visible:ring-lime/50',

          '[unicode-bidi:plaintext]',

          'group-data-[align=end]/bubble:rounded-ee-[8px] group-data-[align=start]/bubble:rounded-es-[8px]',

          '[[data-slot=conversation-bubble][data-align=start]+[data-slot=conversation-bubble][data-align=start]>&]:rounded-ss-[8px]',
          '[[data-slot=conversation-bubble][data-align=end]+[data-slot=conversation-bubble][data-align=end]>&]:rounded-se-[8px]',
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: 'conversation-content',
    },
  })
}

export { Conversation, ConversationBubble, ConversationContent }
