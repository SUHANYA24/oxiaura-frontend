/**
 * Minimal class-name joiner. Filters out falsey values so conditional classes
 * read cleanly at the call site: cn('btn', isActive && 'btn-primary', className)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default cn
