'use client'

import { OperatorHeader } from './operator-header'
import { BottomTabBar } from './bottom-tab-bar'

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] bg-surface-sunken flex flex-col items-center overflow-hidden">
      <div className="w-full max-w-[480px] h-full flex flex-col bg-background">
        <OperatorHeader />
        <main className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
          {children}
        </main>
        <BottomTabBar />
      </div>
    </div>
  )
}
