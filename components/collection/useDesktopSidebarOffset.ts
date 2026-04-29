'use client'

import { useLayoutEffect, useRef, useState } from 'react'

export function useDesktopSidebarOffset(activeIndex: number | null, enabled: boolean) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef(new Map<number, HTMLDivElement>())
  const [isDesktop, setIsDesktop] = useState(false)
  const [sidebarOffset, setSidebarOffset] = useState(0)

  useLayoutEffect(() => {
    const updateViewport = () => setIsDesktop(window.innerWidth >= 768)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  useLayoutEffect(() => {
    if (!enabled || !isDesktop || activeIndex === null) {
      setSidebarOffset(0)
      return
    }

    const updateOffset = () => {
      const grid = gridRef.current
      const sidebar = sidebarRef.current
      const selectedCard = cardRefs.current.get(activeIndex)

      if (!grid || !sidebar || !selectedCard) {
        setSidebarOffset(0)
        return
      }

      const desiredOffset = Math.max(selectedCard.offsetTop - 8, 0)
      const maxOffset = Math.max(grid.offsetHeight - sidebar.offsetHeight, 0)
      setSidebarOffset(Math.min(desiredOffset, maxOffset))
    }

    updateOffset()

    const observer = new ResizeObserver(updateOffset)
    if (gridRef.current) observer.observe(gridRef.current)
    if (sidebarRef.current) observer.observe(sidebarRef.current)
    const selectedCard = cardRefs.current.get(activeIndex)
    if (selectedCard) observer.observe(selectedCard)

    window.addEventListener('resize', updateOffset)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateOffset)
    }
  }, [activeIndex, enabled, isDesktop])

  function registerCardRef(index: number) {
    return (node: HTMLDivElement | null) => {
      if (node) {
        cardRefs.current.set(index, node)
      } else {
        cardRefs.current.delete(index)
      }
    }
  }

  return {
    gridRef,
    sidebarRef,
    sidebarOffset: isDesktop && enabled ? sidebarOffset : 0,
    registerCardRef,
  }
}
