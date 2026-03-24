interface TopAppBarProps {
  title: string
}

export default function TopAppBar({ title }: TopAppBarProps) {
  return (
    <header className="fixed top-0 w-full max-w-[430px] z-50 bg-surface-container header-safe">
      <div className="flex justify-between items-center px-6 py-4">
        {/* Avatar + Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden flex items-center justify-center">
            <span className="material-symbols-outlined text-outline">person</span>
          </div>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">
            {title}
          </h1>
        </div>

        {/* Notification Bell */}
        <button className="text-primary transition-opacity hover:opacity-70 active:scale-95 duration-150">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  )
}
