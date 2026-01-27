import { useState, useEffect, useRef, useCallback, type ReactNode, type CSSProperties, cloneElement, isValidElement, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { glass, radius, spacing, transitions } from './tokens.js';

export interface PortalPopoverProps {
  /** Content to render inside the popover */
  content: ReactNode;
  /** The trigger element - must be a single React element that accepts ref and event handlers */
  children: ReactElement;
  /** Whether the popover is currently open (controlled) */
  open?: boolean;
  /** Callback when open state should change */
  onOpenChange?: (open: boolean) => void;
  /** Delay in ms before opening on hover */
  openDelay?: number;
  /** Delay in ms before closing on mouse leave */
  closeDelay?: number;
  /** Test ID for the popover content */
  'data-testid'?: string;
  /** Unique ID for ARIA */
  tooltipId?: string;
}

type Placement = 'right' | 'left' | 'bottom' | 'top';

interface Position {
  top: number;
  left: number;
  placement: Placement;
  arrowTop: number;
  arrowLeft: number;
}

const VIEWPORT_PADDING = 12;
const GAP = 10;
const POPOVER_WIDTH = 340;
const ARROW_SIZE = 8;

/**
 * Calculate best placement and position for the popover.
 * Priority: right → left → bottom → top
 */
function calculatePosition(
  anchorRect: DOMRect,
  popoverHeight: number
): Position {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate available space in each direction
  const spaceRight = viewportWidth - anchorRect.right - GAP - VIEWPORT_PADDING;
  const spaceLeft = anchorRect.left - GAP - VIEWPORT_PADDING;
  const spaceBottom = viewportHeight - anchorRect.bottom - GAP - VIEWPORT_PADDING;
  const spaceTop = anchorRect.top - GAP - VIEWPORT_PADDING;

  // Determine placement (priority: right → left → bottom → top)
  let placement: Placement;
  if (spaceRight >= POPOVER_WIDTH) {
    placement = 'right';
  } else if (spaceLeft >= POPOVER_WIDTH) {
    placement = 'left';
  } else if (spaceBottom >= popoverHeight) {
    placement = 'bottom';
  } else if (spaceTop >= popoverHeight) {
    placement = 'top';
  } else {
    // Not enough space anywhere, default to right (will overflow but be visible)
    placement = 'right';
  }

  let top: number;
  let left: number;
  let arrowTop: number;
  let arrowLeft: number;

  const anchorCenterY = anchorRect.top + anchorRect.height / 2;
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;

  switch (placement) {
    case 'right':
      left = anchorRect.right + GAP;
      // Vertically center to anchor
      top = anchorCenterY - popoverHeight / 2;
      // Clamp to viewport
      top = Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - popoverHeight - VIEWPORT_PADDING));
      // Arrow points to anchor center
      arrowLeft = -ARROW_SIZE;
      arrowTop = anchorCenterY - top - ARROW_SIZE / 2;
      break;

    case 'left':
      left = anchorRect.left - POPOVER_WIDTH - GAP;
      top = anchorCenterY - popoverHeight / 2;
      top = Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - popoverHeight - VIEWPORT_PADDING));
      arrowLeft = POPOVER_WIDTH;
      arrowTop = anchorCenterY - top - ARROW_SIZE / 2;
      break;

    case 'bottom':
      top = anchorRect.bottom + GAP;
      left = anchorRect.left;
      // Clamp horizontally
      left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - POPOVER_WIDTH - VIEWPORT_PADDING));
      arrowTop = -ARROW_SIZE;
      arrowLeft = anchorCenterX - left - ARROW_SIZE / 2;
      break;

    case 'top':
    default:
      top = anchorRect.top - popoverHeight - GAP;
      left = anchorRect.left;
      left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - POPOVER_WIDTH - VIEWPORT_PADDING));
      arrowTop = popoverHeight;
      arrowLeft = anchorCenterX - left - ARROW_SIZE / 2;
      break;
  }

  // Clamp arrow position within popover bounds
  if (placement === 'right' || placement === 'left') {
    arrowTop = Math.max(12, Math.min(arrowTop, popoverHeight - 12 - ARROW_SIZE));
  } else {
    arrowLeft = Math.max(12, Math.min(arrowLeft, POPOVER_WIDTH - 12 - ARROW_SIZE));
  }

  return { top, left, placement, arrowTop, arrowLeft };
}

/**
 * Get arrow styles based on placement.
 */
function getArrowStyles(placement: Placement, arrowTop: number, arrowLeft: number): CSSProperties {
  const baseStyle: CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    border: `${ARROW_SIZE}px solid transparent`,
  };

  switch (placement) {
    case 'right':
      return {
        ...baseStyle,
        left: arrowLeft,
        top: arrowTop,
        borderRightColor: 'rgba(253, 252, 250, 0.95)',
        borderLeftWidth: 0,
      };
    case 'left':
      return {
        ...baseStyle,
        left: arrowLeft,
        top: arrowTop,
        borderLeftColor: 'rgba(253, 252, 250, 0.95)',
        borderRightWidth: 0,
      };
    case 'bottom':
      return {
        ...baseStyle,
        left: arrowLeft,
        top: arrowTop,
        borderBottomColor: 'rgba(253, 252, 250, 0.95)',
        borderTopWidth: 0,
      };
    case 'top':
    default:
      return {
        ...baseStyle,
        left: arrowLeft,
        top: arrowTop,
        borderTopColor: 'rgba(253, 252, 250, 0.95)',
        borderBottomWidth: 0,
      };
  }
}

/**
 * A portal-based popover component that renders to document.body.
 * Handles hover/focus triggers, collision detection, and smooth transitions.
 */
export function PortalPopover({
  content,
  children,
  open: controlledOpen,
  onOpenChange,
  openDelay = 150,
  closeDelay = 150,
  'data-testid': testId,
  tooltipId,
}: PortalPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generatedId = useRef(`tooltip-${Math.random().toString(36).slice(2, 9)}`);
  const actualTooltipId = tooltipId || generatedId.current;

  // Use controlled or internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = useCallback((value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  }, [onOpenChange]);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Calculate position when open changes
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return;
        const anchorRect = triggerRef.current.getBoundingClientRect();
        const popoverHeight = popoverRef.current?.offsetHeight || 200;
        const newPosition = calculatePosition(anchorRect, popoverHeight);
        setPosition(newPosition);
        requestAnimationFrame(() => setIsVisible(true));
      };

      updatePosition();

      // Close on scroll (any scroll container)
      const handleScroll = () => {
        setIsOpen(false);
      };

      // Close on resize
      const handleResize = () => {
        setIsOpen(false);
      };

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    } else {
      setIsVisible(false);
      setPosition(null);
    }
  }, [isOpen, setIsOpen]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const cancelClose = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const cancelOpen = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(() => {
    cancelClose();
    cancelOpen();
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, openDelay);
  }, [cancelClose, cancelOpen, openDelay, setIsOpen]);

  const scheduleClose = useCallback(() => {
    cancelOpen();
    cancelClose();
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, closeDelay);
  }, [cancelOpen, cancelClose, closeDelay, setIsOpen]);

  const handleTriggerMouseEnter = useCallback(() => {
    scheduleOpen();
  }, [scheduleOpen]);

  const handleTriggerMouseLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const handleTriggerFocus = useCallback(() => {
    cancelClose();
    cancelOpen();
    setIsOpen(true);
  }, [cancelClose, cancelOpen, setIsOpen]);

  const handleTriggerBlur = useCallback((e: React.FocusEvent) => {
    // Don't close if focus moved to popover
    if (popoverRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    scheduleClose();
  }, [scheduleClose]);

  const handlePopoverMouseEnter = useCallback(() => {
    cancelClose();
  }, [cancelClose]);

  const handlePopoverMouseLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const handlePopoverBlur = useCallback((e: React.FocusEvent) => {
    // Don't close if focus moved to trigger
    if (triggerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    scheduleClose();
  }, [scheduleClose]);

  // Handle focus moving into popover from trigger
  const handlePopoverFocus = useCallback(() => {
    cancelClose();
    cancelOpen();
  }, [cancelClose, cancelOpen]);

  const popoverContent = isOpen && position ? createPortal(
    <div
      ref={popoverRef}
      id={actualTooltipId}
      role="tooltip"
      aria-hidden={!isVisible}
      data-testid={testId}
      onMouseEnter={handlePopoverMouseEnter}
      onMouseLeave={handlePopoverMouseLeave}
      onFocus={handlePopoverFocus}
      onBlur={handlePopoverBlur}
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH,
        zIndex: 9999,
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'scale(1)'
          : 'scale(0.98)',
        transformOrigin: position.placement === 'right' ? 'left center'
          : position.placement === 'left' ? 'right center'
          : position.placement === 'bottom' ? 'top center'
          : 'bottom center',
        transition: `opacity ${transitions.normal}, transform ${transitions.normal}`,
        pointerEvents: isVisible ? 'auto' : 'none',
        // Glass styling from tokens
        ...glass.elevated,
        borderRadius: radius.lg,
        padding: spacing.xl,
      }}
    >
      {/* Arrow */}
      <div style={getArrowStyles(position.placement, position.arrowTop, position.arrowLeft)} />
      {content}
    </div>,
    document.body
  ) : null;

  // Clone the child element and attach our ref + handlers
  if (!isValidElement(children)) {
    return <>{children}</>;
  }

  const childProps = children.props as Record<string, unknown>;
  const triggerElement = cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      // Store in our ref using Object.assign to work around readonly
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      // Forward to child's ref if it has one
      const childRef = (children as ReactElement & { ref?: React.Ref<HTMLElement> }).ref;
      if (typeof childRef === 'function') {
        childRef(node);
      } else if (childRef && typeof childRef === 'object' && 'current' in childRef) {
        (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      handleTriggerMouseEnter();
      if (typeof childProps.onMouseEnter === 'function') {
        (childProps.onMouseEnter as (e: React.MouseEvent) => void)(e);
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleTriggerMouseLeave();
      if (typeof childProps.onMouseLeave === 'function') {
        (childProps.onMouseLeave as (e: React.MouseEvent) => void)(e);
      }
    },
    onFocus: (e: React.FocusEvent) => {
      handleTriggerFocus();
      if (typeof childProps.onFocus === 'function') {
        (childProps.onFocus as (e: React.FocusEvent) => void)(e);
      }
    },
    onBlur: (e: React.FocusEvent) => {
      handleTriggerBlur(e);
      if (typeof childProps.onBlur === 'function') {
        (childProps.onBlur as (e: React.FocusEvent) => void)(e);
      }
    },
    'aria-describedby': isOpen ? actualTooltipId : undefined,
    'data-popover-open': isOpen || undefined,
  } as Record<string, unknown>);

  return (
    <>
      {triggerElement}
      {popoverContent}
    </>
  );
}
