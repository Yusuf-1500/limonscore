'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type LangCode = 'tr' | 'en' | 'ru';
export type LangSetting = 'auto' | LangCode;

const translations: Record<LangCode, Record<string, string>> = {
  tr: {
    nav_home: 'Ana Sayfa',
    nav_favorites: 'Favoriler',
    nav_search: 'Arama',
    nav_profile: 'Profil',
    search_placeholder: 'Takım, lig veya ülke ara...',
    leagues_title: 'Ligler & Turnuvalar',
    all_leagues: 'Tüm Ligler',
    popular_leagues: 'Popüler Ligler',
    other_tournaments: 'Diğer Turnuvalar',
    filter_all: 'Tümü',
    filter_live: 'Canlı',
    filter_ft: 'Biten',
    filter_ns: 'Başlayacak',
    day_yesterday: 'Dün',
    day_today: 'Bugün',
    day_tomorrow: 'Yarın',
    my_favorites: 'Favorilerim',
    no_favorites_hint: 'Maçların solundaki yıldız ikonuna dokunarak favorilerinize ekleyebilirsiniz.',
    profile_title: 'LimonScore Taraftar Profili',
    profile_account_linked: 'limonscore.com Hesabı Bağlı',
    profile_local_active: 'Yerel cihaz tercihleri aktif',
    stat_fav_matches: 'Favori Maç',
    stat_fav_teams: 'Favori Takım',
    stat_live_matches: 'Canlı Maç',
    lang_settings_title: 'Dil Ayarları',
    lang_settings_desc: 'Arayüz dilini seçin veya tarayıcı dilini otomatik kullanın',
    lang_auto: 'Otomatik',
    notif_settings_title: 'Canlı Gol Bildirimi Ayarları',
    sound_alert: 'Sesli Gol Uyarısı',
    sound_alert_desc: 'Gol olduğunda bildirim sesi çalar',
    only_fav_alert: 'Sadece Favoriler İçin Bildirim',
    only_fav_alert_desc: 'Yalnızca yıldızlı maç/takım gollerinde uyar',
    status_open: 'Açık',
    status_closed: 'Kapalı',
    status_all: 'Tümü',
    tab_events: 'Olaylar',
    tab_stats: 'İstat.',
    tab_lineups: '2D Saha',
    tab_standings: 'Puan',
    tab_h2h: 'H2H',
    panel_welcome_title: 'LimonScore Maç Merkezi',
    panel_welcome_desc: 'Canlı olayları, istatistikleri, tıklanabilir 2D dizilişi, lig puan tablosunu ve H2H geçmişini incelemek için listeden bir maç seçin.',
    loading_match: 'Maç verileri yükleniyor...',
    no_events: 'Henüz kaydedilmiş gol, kart veya oyuncu değişikliği bulunmuyor.',
    no_standings: 'Bu turnuva/kupa karşılaşması için lig puan tablosu bulunmuyor.',
    no_h2h: 'İki takım arasında kayıtlı geçmiş karşılaşma bulunamadı.',
    col_team: 'Takım',
    btn_back: 'Geri',
  },
  en: {
    nav_home: 'Home',
    nav_favorites: 'Favorites',
    nav_search: 'Search',
    nav_profile: 'Profile',
    search_placeholder: 'Search team, league or country...',
    leagues_title: 'Leagues & Tournaments',
    all_leagues: 'All Leagues',
    popular_leagues: 'Popular Leagues',
    other_tournaments: 'Other Tournaments',
    filter_all: 'All',
    filter_live: 'Live',
    filter_ft: 'Finished',
    filter_ns: 'Scheduled',
    day_yesterday: 'Yesterday',
    day_today: 'Today',
    day_tomorrow: 'Tomorrow',
    my_favorites: 'My Favorites',
    no_favorites_hint: 'Tap the star icon next to matches to add them to your favorites.',
    profile_title: 'LimonScore Fan Profile',
    profile_account_linked: 'limonscore.com Account Linked',
    profile_local_active: 'Local device preferences active',
    stat_fav_matches: 'Fav Matches',
    stat_fav_teams: 'Fav Teams',
    stat_live_matches: 'Live Matches',
    lang_settings_title: 'Language Settings',
    lang_settings_desc: 'Select interface language or auto-detect from browser',
    lang_auto: 'Auto',
    notif_settings_title: 'Live Goal Alert Settings',
    sound_alert: 'Goal Sound Alert',
    sound_alert_desc: 'Play notification chime when a goal is scored',
    only_fav_alert: 'Favorites Alerts Only',
    only_fav_alert_desc: 'Notify only for starred matches/teams',
    status_open: 'On',
    status_closed: 'Off',
    status_all: 'All',
    tab_events: 'Events',
    tab_stats: 'Stats',
    tab_lineups: '2D Pitch',
    tab_standings: 'Standings',
    tab_h2h: 'H2H',
    panel_welcome_title: 'LimonScore Match Center',
    panel_welcome_desc: 'Select a match from the list to view live events, stats, interactive 2D lineups, league standings and H2H history.',
    loading_match: 'Loading match data...',
    no_events: 'No recorded goals, cards or substitutions yet.',
    no_standings: 'No league standings available for this tournament/cup match.',
    no_h2h: 'No past head-to-head matches found between these teams.',
    col_team: 'Team',
    btn_back: 'Back',
  },
  ru: {
    nav_home: 'Главная',
    nav_favorites: 'Избранное',
    nav_search: 'Поиск',
    nav_profile: 'Профиль',
    search_placeholder: 'Поиск команды, лиги или страны...',
    leagues_title: 'Лиги и турниры',
    all_leagues: 'Все лиги',
    popular_leagues: 'Популярные лиги',
    other_tournaments: 'Другие турниры',
    filter_all: 'Все',
    filter_live: 'Live',
    filter_ft: 'Заверш.',
    filter_ns: 'Скоро',
    day_yesterday: 'Вчера',
    day_today: 'Сегодня',
    day_tomorrow: 'Завтра',
    my_favorites: 'Избранное',
    no_favorites_hint: 'Нажмите на значок звезды рядом с матчем, чтобы добавить его в избранное.',
    profile_title: 'Профиль болельщика LimonScore',
    profile_account_linked: 'Аккаунт limonscore.com привязан',
    profile_local_active: 'Локальные настройки активны',
    stat_fav_matches: 'Избр. матчи',
    stat_fav_teams: 'Избр. команды',
    stat_live_matches: 'Матчи Live',
    lang_settings_title: 'Настройки языка',
    lang_settings_desc: 'Выберите язык интерфейса или автоопределение браузера',
    lang_auto: 'Авто',
    notif_settings_title: 'Уведомления о голах',
    sound_alert: 'Звуковой сигнал гола',
    sound_alert_desc: 'Воспроизводить звук при забитом голе',
    only_fav_alert: 'Только для избранного',
    only_fav_alert_desc: 'Уведомлять только о матчах и командах со звездой',
    status_open: 'Вкл',
    status_closed: 'Выкл',
    status_all: 'Все',
    tab_events: 'События',
    tab_stats: 'Статист.',
    tab_lineups: '2D Поле',
    tab_standings: 'Таблица',
    tab_h2h: 'H2H',
    panel_welcome_title: 'Матч-центр LimonScore',
    panel_welcome_desc: 'Выберите матч из списка, чтобы посмотреть события, статистику, 2D-составы, таблицу и историю встреч.',
    loading_match: 'Загрузка данных матча...',
    no_events: 'Пока нет записанных голов, карточек или замен.',
    no_standings: 'Для этого турнира/кубка таблица недоступна.',
    no_h2h: 'История личных встреч между командами не найдена.',
    col_team: 'Команда',
    btn_back: 'Назад',
  },
};

function detectBrowserLang(): LangCode {
  if (typeof navigator === 'undefined') return 'tr';
  const raw = (navigator.language || navigator.languages?.[0] || 'tr').toLowerCase();
  if (raw.startsWith('ru')) return 'ru';
  if (raw.startsWith('en')) return 'en';
  return 'tr';
}

interface LanguageContextValue {
  lang: LangCode;
  setting: LangSetting;
  setLangSetting: (val: LangSetting) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'tr',
  setting: 'auto',
  setLangSetting: () => {},
  t: (key) => translations.tr[key] || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [setting, setSetting] = useState<LangSetting>('auto');
  const [lang, setLang] = useState<LangCode>('tr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('limonscore_lang') as LangSetting | null;
      if (saved === 'tr' || saved === 'en' || saved === 'ru') {
        setSetting(saved);
        setLang(saved);
        document.documentElement.lang = saved;
        return;
      }
    } catch {}
    const detected = detectBrowserLang();
    setSetting('auto');
    setLang(detected);
    document.documentElement.lang = detected;
  }, []);

  const setLangSetting = (val: LangSetting) => {
    setSetting(val);
    try {
      localStorage.setItem('limonscore_lang', val);
    } catch {}
    const resolved = val === 'auto' ? detectBrowserLang() : val;
    setLang(resolved);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = resolved;
    }
  };

  const t = (key: string) => translations[lang]?.[key] || translations.tr[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setting, setLangSetting, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}