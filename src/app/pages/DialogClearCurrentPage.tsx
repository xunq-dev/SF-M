import EditorConfirmationDialog from "../components/confirmation/EditorConfirmationDialog";

export default function DialogClearCurrentPage() {
  return (
    <div className="fixed inset-0 h-dvh w-full overflow-hidden">
      <EditorConfirmationDialog mode="current" />
    </div>
  );
}
