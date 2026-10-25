import React from 'react';

export const Navigation = React.createContext(null);
export function Link({ href, children, onClick, ...props }) {
  const navigate = React.useContext(Navigation);
  return <a href={href} {...props} onClick={event => {
    onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); navigate(href);
    }
  }}>{children}</a>;
}
