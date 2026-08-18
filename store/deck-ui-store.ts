import { create } from "zustand";

export type DeckSheetKind =
  | "none"
  | "card-actions"
  | "add-card"
  | "deck-settings"
  | "deck-actions"
  | "commander-picker";

type DeckUiState = {
  selectedDeckCardIds: string[];
  multiSelectMode: boolean;
  activeDeckIdForSearch: string | null;
  openSheet: DeckSheetKind;
  activeDeckCardId: string | null;
  showArchived: boolean;

  setSelectedDeckCardIds: (ids: string[]) => void;
  toggleSelectedDeckCardId: (id: string) => void;
  clearSelection: () => void;
  enterMultiSelect: (initialId?: string) => void;
  exitMultiSelect: () => void;
  setActiveDeckIdForSearch: (deckId: string | null) => void;
  setOpenSheet: (sheet: DeckSheetKind) => void;
  setActiveDeckCardId: (id: string | null) => void;
  setShowArchived: (show: boolean) => void;
};

export const useDeckUiStore = create<DeckUiState>((set, get) => ({
  selectedDeckCardIds: [],
  multiSelectMode: false,
  activeDeckIdForSearch: null,
  openSheet: "none",
  activeDeckCardId: null,
  showArchived: false,

  setSelectedDeckCardIds: (ids) => set({ selectedDeckCardIds: ids }),

  toggleSelectedDeckCardId: (id) => {
    const current = get().selectedDeckCardIds;
    if (current.includes(id)) {
      set({ selectedDeckCardIds: current.filter((x) => x !== id) });
    } else {
      set({ selectedDeckCardIds: [...current, id] });
    }
  },

  clearSelection: () => set({ selectedDeckCardIds: [] }),

  enterMultiSelect: (initialId) =>
    set({
      multiSelectMode: true,
      selectedDeckCardIds: initialId ? [initialId] : [],
    }),

  exitMultiSelect: () =>
    set({ multiSelectMode: false, selectedDeckCardIds: [] }),

  setActiveDeckIdForSearch: (deckId) => set({ activeDeckIdForSearch: deckId }),

  setOpenSheet: (sheet) => set({ openSheet: sheet }),

  setActiveDeckCardId: (id) => set({ activeDeckCardId: id }),

  setShowArchived: (show) => set({ showArchived: show }),
}));
