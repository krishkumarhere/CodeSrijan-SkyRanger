import React from "react";
import { Tooltip } from "react-tooltip";
import { useAuth } from "./useAuth";

/**
 * Wraps any interactive element (button, switch, etc.).
 * If the current user role is not allowed, the child is rendered
 * disabled with a polished tooltip explaining the restriction.
 */
export const PermissionGate = ({
  allowedRoles,
  children,
  tooltipMessage = "Operator access required",
}) => {
  const { role } = useAuth();
  const allowed = allowedRoles.includes(role);

  // Clone the child and inject disabled+aria-disabled if not allowed
  const child = React.cloneElement(React.Children.only(children), {
    disabled: !allowed,
    "aria-disabled": !allowed,
    ...(children.props?.className?.includes("disabled")
      ? {}
      : { className: `${children.props?.className || ""} ${!allowed ? "opacity-50 cursor-not-allowed" : ""}` }),
  });

  return allowed ? (
    child
  ) : (
    <div data-tooltip-id="permission-tooltip" data-tooltip-content={tooltipMessage} className="inline-block w-full">
      {child}
      <Tooltip id="permission-tooltip" place="top" />
    </div>
  );
};
