export type V3EditorLayout = {
  tabBarTop: number;
  tabBarHeight: number;
  tabHeight: number;
  tabWidth: number;
  tabRadius: number;
  tabGap: number;
  tabFontSize: number;
  tabIconLeft: number;
  tabIconTop: number;
  tabIconSize: number;
  tabTitleLeft: number;
  tabTitleRight: number;
  tabCloseRight: number;
  tabCloseTop: number;
  tabCloseSize: number;
  tabScrollStep: number;
  editorTop: number;
  editorBottom: number;
  tabShadowTop: number;
  tabShadowHeight: number;
  editorShadowTop: number;
  sidebarTop: number;
  sidebarShadowTop: number;
  actionBarHeight: number;
  buttonWidth: number;
  buttonHeight: number;
  buttonFontSize: number;
  buttonGap: number;
  buttonBottomPad: number;
  buttonIconSize: number;
  buttonIconLabelGap: number;
  statusBottom: number;
  statusIconGap: number;
  /** Attach plug — bottom-right toolbar, left of the script sidebar. */
  statusAttachIconSize: number;
  /** Console, search, and AI icons in the bottom-right cluster. */
  statusUtilityIconSize: number;
  sidebarSectionIconSize: number;
  sidebarRowIconSize: number;
  sidebarRowActionIconSize: number;
  sidebarTrailingIconSize: number;
};

const NORMAL_LAYOUT: Omit<
  V3EditorLayout,
  | "editorBottom"
  | "actionBarHeight"
  | "buttonWidth"
  | "buttonHeight"
  | "buttonFontSize"
  | "buttonGap"
  | "buttonBottomPad"
  | "buttonIconSize"
  | "buttonIconLabelGap"
  | "statusBottom"
  | "statusIconGap"
  | "statusAttachIconSize"
  | "statusUtilityIconSize"
  | "sidebarSectionIconSize"
  | "sidebarRowIconSize"
  | "sidebarRowActionIconSize"
  | "sidebarTrailingIconSize"
> = {
  tabBarTop: 50,
  tabBarHeight: 32,
  tabHeight: 32,
  tabWidth: 159,
  tabRadius: 5,
  tabGap: 5,
  tabFontSize: 12,
  tabIconLeft: 8,
  tabIconTop: 9,
  tabIconSize: 13,
  tabTitleLeft: 31,
  tabTitleRight: 25,
  tabCloseRight: 8,
  tabCloseTop: 9,
  tabCloseSize: 11,
  tabScrollStep: 164,
  editorTop: 87,
  tabShadowTop: 48,
  tabShadowHeight: 37,
  editorShadowTop: 85,
  sidebarTop: 50,
  sidebarShadowTop: 84,
};

const COMPACT_TABS_LAYOUT: Partial<V3EditorLayout> = {
  tabBarTop: 48,
  tabBarHeight: 24,
  tabHeight: 24,
  tabWidth: 120,
  tabRadius: 0,
  tabGap: 2,
  tabFontSize: 11,
  tabIconLeft: 6,
  tabIconTop: 5,
  tabIconSize: 11,
  tabTitleLeft: 24,
  tabTitleRight: 20,
  tabCloseRight: 6,
  tabCloseTop: 6,
  tabCloseSize: 9,
  tabScrollStep: 122,
  editorTop: 76,
  tabShadowTop: 46,
  tabShadowHeight: 30,
  editorShadowTop: 74,
  sidebarTop: 48,
  sidebarShadowTop: 73,
};

const NORMAL_BUTTONS: Pick<
  V3EditorLayout,
  | "editorBottom"
  | "actionBarHeight"
  | "buttonWidth"
  | "buttonHeight"
  | "buttonFontSize"
  | "buttonGap"
  | "buttonBottomPad"
  | "buttonIconSize"
  | "buttonIconLabelGap"
  | "statusBottom"
  | "statusIconGap"
  | "statusAttachIconSize"
  | "statusUtilityIconSize"
  | "sidebarSectionIconSize"
  | "sidebarRowIconSize"
  | "sidebarRowActionIconSize"
  | "sidebarTrailingIconSize"
> = {
  editorBottom: 46,
  actionBarHeight: 46,
  buttonWidth: 91,
  buttonHeight: 33,
  buttonFontSize: 14,
  buttonGap: 4,
  buttonBottomPad: 6,
  buttonIconSize: 14,
  buttonIconLabelGap: 4,
  statusBottom: 12,
  statusIconGap: 9,
  statusAttachIconSize: 20,
  statusUtilityIconSize: 20,
  sidebarSectionIconSize: 16,
  sidebarRowIconSize: 16,
  sidebarRowActionIconSize: 14,
  sidebarTrailingIconSize: 16,
};

const COMPACT_BUTTONS: Pick<
  V3EditorLayout,
  | "editorBottom"
  | "actionBarHeight"
  | "buttonWidth"
  | "buttonHeight"
  | "buttonFontSize"
  | "buttonGap"
  | "buttonBottomPad"
  | "buttonIconSize"
  | "buttonIconLabelGap"
  | "statusBottom"
  | "statusIconGap"
  | "statusAttachIconSize"
  | "statusUtilityIconSize"
  | "sidebarSectionIconSize"
  | "sidebarRowIconSize"
  | "sidebarRowActionIconSize"
  | "sidebarTrailingIconSize"
> = {
  editorBottom: 32,
  actionBarHeight: 32,
  buttonWidth: 72,
  buttonHeight: 26,
  buttonFontSize: 12,
  buttonGap: 4,
  buttonBottomPad: 4,
  buttonIconSize: 11,
  buttonIconLabelGap: 3,
  statusBottom: 8,
  statusIconGap: 7,
  statusAttachIconSize: 17,
  statusUtilityIconSize: 17,
  sidebarSectionIconSize: 13,
  sidebarRowIconSize: 13,
  sidebarRowActionIconSize: 11,
  sidebarTrailingIconSize: 13,
};

export function resolveV3EditorLayout(compactTabs: boolean, compactButtons: boolean): V3EditorLayout {
  return {
    ...NORMAL_LAYOUT,
    ...(compactTabs ? COMPACT_TABS_LAYOUT : {}),
    ...(compactButtons ? COMPACT_BUTTONS : NORMAL_BUTTONS),
  };
}
