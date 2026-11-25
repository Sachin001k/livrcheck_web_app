"use client";
// Port of lib/screens/delete_account_dialog.dart: type DELETE, then the account
// and all its rows are erased (RPC delete_my_account). The auth listener then
// shows the login screen.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, useToast } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { deleteAccount, describeError } from "@/lib/auth";

export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useT();
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = text.trim().toUpperCase() === "DELETE";

  const close = () => {
    if (deleting) return;
    setText("");
    setError(null);
    onClose();
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      router.replace("/");
      toast(t("deleteAccountDone"));
    } catch (e) {
      setDeleting(false);
      setError(`${t("deleteAccountFailed")} ${describeError(e, "", lang)}`);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={<span className="flex flex-col items-center gap-2 text-center"><span className="text-4xl text-high">⚠️</span>{t("deleteAccountTitle")}</span>}
      actions={<>
        <Button variant="text" disabled={deleting} onClick={close}>{t("cancel")}</Button>
        <Button variant="danger" disabled={!confirmed || deleting} onClick={remove}>
          {deleting
            ? <span className="inline-block size-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white" />
            : t("deleteAccountConfirm")}
        </Button>
      </>}
    >
      <p>{t("deleteAccountBody")}</p>
      <label className="mt-4 block">
        <span className="mb-1 block text-sm text-muted">{t("deleteAccountTypeToConfirm")}</span>
        <input
          value={text} autoFocus disabled={deleting} autoCapitalize="characters" autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirmed && !deleting && remove()}
          className="min-h-12 w-full rounded-lg border border-black/30 px-3 text-base uppercase outline-none focus:border-2 focus:border-high"
        />
      </label>
      {error && <p role="alert" className="mt-2.5 text-high">{error}</p>}
    </Dialog>
  );
}
