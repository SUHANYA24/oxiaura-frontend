import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

/**
 * The signed-token QR — black on white so it reads as native to the monochrome
 * system, no coloured frame. Encodes the public /verify/{token} URL, so a
 * scanner lands straight on the authenticity page with no session.
 *
 * Below the code sits the verify URL in mono with a copy action; scanning is the
 * primary path, copying the link is the fallback for anyone without a camera.
 */
export default function QRDisplay({ token, size = 176, className }) {
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const verifyUrl = token ? `${origin}/verify/${token}` : ''

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      setCopied(true)
      toast.success('Verification link copied.')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy the link.')
    }
  }

  if (!token) {
    return (
      <div className={cn('flex flex-col items-center', className)}>
        <div
          className="flex items-center justify-center rounded-control border border-dashed border-ink-300 bg-ink-50 text-ink-400"
          style={{ width: size, height: size }}
        >
          <span className="text-[13px]">No QR token</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="rounded-control border border-ink-200 bg-white p-3">
        <QRCodeSVG
          value={verifyUrl}
          size={size}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#0A0A0A"
          aria-label="Agreement verification QR code"
        />
      </div>

      <p className="meta-label mt-3">Scan to verify authenticity</p>

      <div className="mt-2 flex w-full items-center gap-2 rounded-control border border-ink-200 bg-ink-50 px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-600" title={verifyUrl}>
          {verifyUrl}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-600 transition-colors duration-150 ease-out hover:text-ink-950"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
