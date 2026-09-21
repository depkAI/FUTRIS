'use client'

interface IntroProps {
  hasProgress: boolean
  hydrated: boolean
  onBegin: () => void
  onContinue: () => void
}

export function Intro({ hasProgress, hydrated, onBegin, onContinue }: IntroProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-between px-6 pb-10 pt-[16vh]">
      <div className="fade-up-slow flex w-full max-w-md flex-col items-center text-center">
        <span className="ginzel-cta mb-6 text-[10px] uppercase sm:text-xs">
          A Love Fortune
        </span>
        <h1 className="title-display gold-text text-6xl leading-none sm:text-7xl">
          FOUR
          <br />
          CUPS
        </h1>
        <p className="glass mt-8 rounded-full px-5 py-2 text-xs tracking-widest text-mist-300/90 sm:text-sm">
          Fold the paper. Choose by instinct. One path leads to your fortune.
        </p>
      </div>

      <div className="fade-up flex w-full max-w-xs flex-col items-center gap-3">
        {hasProgress && (
          <button
            onClick={onContinue}
            className="option-btn !text-center !py-3.5 w-full"
          >
            <span className="font-medium tracking-widest text-gold-300">CONTINUE</span>
          </button>
        )}
        <button
          onClick={hasProgress ? onBegin : onBegin}
          className="glow-pulse title-display w-full rounded-full border border-gold-500/50 bg-gold-500/10 py-4 text-base tracking-[0.3em] text-gold-300 transition-all duration-300 hover:bg-gold-500/20 hover:shadow-glow-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
          disabled={!hydrated}
        >
          {hasProgress && !hydrated ? '…' : hasProgress ? 'BEGIN ANEW' : 'BEGIN'}
        </button>
        <p className="text-center text-[11px] tracking-wide text-mist-500">
          no accounts · no tracking · just your path
        </p>
      </div>
    </div>
  )
}