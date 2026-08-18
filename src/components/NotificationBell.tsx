{/* ======================================================
    FLOATING AUTO NOTIFICATION (Compact & Sleek)
    ====================================================== */}

{popupNotification && popupIconData && (
  <div
    className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm",
      "transition-all duration-300 ease-out",
      popupVisible
        ? "translate-y-0 opacity-100 scale-100"
        : "-translate-y-4 opacity-0 scale-95 pointer-events-none"
    )}
  >
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/80",
        "bg-background/95 backdrop-blur-md shadow-lg",
        "cursor-pointer transition-all hover:border-primary/40"
      )}
      onClick={handlePopupClick}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        {/* Compact Icon */}
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            popupIconData.bg
          )}
        >
          {PopupIcon ? (
            <PopupIcon className={cn("h-3.5 w-3.5", popupIconData.className)} />
          ) : (
            <span className="text-xs">{popupIconData.emoji}</span>
          )}
        </div>

        {/* Compact Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
              New Notification
            </span>
            <span className="text-[10px] text-muted-foreground/80 shrink-0">
              {formatDistanceToNow(new Date(popupNotification.created_at), {
                addSuffix: false,
              })}
            </span>
          </div>

          <p className="text-xs font-semibold text-foreground truncate leading-snug">
            {popupNotification.title}{" "}
            <span className="font-normal text-muted-foreground">
              — {popupNotification.message}
            </span>
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          aria-label="Close notification"
          onClick={(event) => {
            event.stopPropagation();
            closePopup();
          }}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Subtle Progress Bar */}
      <div className="h-[2px] w-full bg-muted/50">
        <div
          className={cn(
            "h-full bg-primary/80",
            popupVisible
              ? "animate-[notification-progress_5s_linear_forwards]"
              : "w-0"
          )}
        />
      </div>
    </div>
  </div>
)}
