import type { SVGProps } from 'react'

/**
 * Ícono personalizado de cabeza de res (vaca/becerro/toro).
 * Compatible con la interfaz de Lucide: acepta className, strokeWidth y demás
 * props SVG estándar para usarse como reemplazo directo de cualquier ícono Lucide.
 */
export function CattleIcon({
  className,
  strokeWidth = 2,
  ...props
}: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Cuerno izquierdo */}
      <path d="M8 7 C8 5 6 2 4 3 C3 4 4 6 6 6" />
      {/* Cuerno derecho */}
      <path d="M16 7 C16 5 18 2 20 3 C21 4 20 6 18 6" />
      {/* Cabeza */}
      <path d="M6 9 C5 7 6 6 8 6 L16 6 C18 6 19 7 18 9 C18 15 15 21 12 21 C9 21 6 15 6 9 Z" />
      {/* Oreja izquierda */}
      <path d="M6 10 C4 9 3 10 3 12 C3 13 4 14 6 13" />
      {/* Oreja derecha */}
      <path d="M18 10 C20 9 21 10 21 12 C21 13 20 14 18 13" />
      {/* Ojos */}
      <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none" />
      {/* Hocico */}
      <ellipse cx="12" cy="17" rx="3" ry="2" />
      {/* Ollares */}
      <circle cx="11" cy="17" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="13" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
