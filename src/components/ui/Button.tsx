import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "error"
    | "ghost"
    | "outline"
    | "menuitem"
    | "icon";
  size?: "sm" | "md" | "lg" | "icon" | "none";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "secondary",
      size = "md",
      fullWidth = false,
      ...props
    },
    ref,
  ) => {
    let baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    let variantStyles = "";
    let sizeStyles = "";

    switch (variant) {
      case "primary":
        variantStyles =
          "bg-teal-700 dark:bg-teal-700 text-white hover:bg-teal-800 dark:hover:bg-teal-600 shadow-lg shadow-teal-900/10 dark:shadow-teal-900/40";
        break;
      case "secondary":
        variantStyles =
          "bg-teal-50 dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-slate-700";
        break;
      case "error":
        variantStyles =
          "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40";
        break;
      case "outline":
        variantStyles =
          "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50";
        break;
      case "ghost":
        variantStyles =
          "bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";
        break;
      case "menuitem":
        variantStyles =
          "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200";
        break;
      case "icon":
        variantStyles =
          "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800";
        break;
    }

    switch (size) {
      case "sm":
        sizeStyles = "px-3 py-1.5 text-sm rounded-lg";
        break;
      case "md":
        sizeStyles = "px-4 py-2.5 text-sm rounded-xl gap-2"; // Adding gap for icons commonly used
        break;
      case "lg":
        sizeStyles = "px-6 py-3 text-base rounded-xl gap-2";
        break;
      case "icon":
        sizeStyles = "p-2 rounded-xl";
        break;
      case "none":
        sizeStyles = "";
        break;
    }

    // override size styles for menuitem
    if (variant === "menuitem") {
      sizeStyles =
        "w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 rounded-none";
    }

    const widthStyles = fullWidth ? "w-full" : "";

    const combinedClassName =
      `${baseStyles} ${variantStyles} ${sizeStyles} ${widthStyles} ${className}`.trim();

    return <button ref={ref} className={combinedClassName} {...props} />;
  },
);

Button.displayName = "Button";
