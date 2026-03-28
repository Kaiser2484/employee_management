import { useState, useMemo } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, CalendarDays, Briefcase, Globe, LogOut, ChevronLeft, ChevronRight, ChevronDown, Settings, Building, ShieldCheck } from 'lucide-react';
import { EmployeesPage } from './features/employees/EmployeesPage';
import { LeavePage } from './features/leave/LeavePage';
import { RecruitmentPage } from './features/recruitment/RecruitmentPage';
import { AdministrationPage } from './features/administration/AdministrationPage';
import { LoginPage } from './features/auth/LoginPage';
import { AccessDeniedPage } from './features/auth/AccessDeniedPage';
import { useActor } from './app/actor-context';
import {
  canAccessAdministration,
  canAccessEmployees,
  canAccessLeave,
  canAccessRecruitment,
  getAllowedRoutes,
} from './app/permissions';

function App() {
  const { t, i18n } = useTranslation();
  const { actor, logout } = useActor();
  const navigate = useNavigate();
  const location = useLocation();
  const [openAdminGroup, setOpenAdminGroup] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('hrm_sidebar');
    return saved !== null ? saved === 'true' : true;
  });

  const availableNavItems = useMemo(() => {
    const items: Array<{ path: string; label: string; icon: React.ReactNode }> = [];
    if (!actor) return items;
    
    if (canAccessEmployees(actor.role)) {
      items.push({ path: '/employees', label: t('nav.employees'), icon: <Users size={20} className="nav-icon" /> });
    }
    if (canAccessLeave(actor.role)) {
      items.push({ path: '/leave', label: t('nav.leave'), icon: <CalendarDays size={20} className="nav-icon" /> });
    }
    if (canAccessRecruitment(actor.role)) {
      items.push({ path: '/recruitment', label: t('nav.recruitment'), icon: <Briefcase size={20} className="nav-icon" /> });
    }
    if (canAccessAdministration(actor.role)) {
      items.push({ path: '/administration', label: t('nav.administration'), icon: <ShieldCheck size={20} className="nav-icon" /> });
    }
    return items;
  }, [actor, t]);

  function toggleSidebar() {
    setIsSidebarExpanded((current) => {
      const next = !current;
      localStorage.setItem('hrm_sidebar', String(next));
      return next;
    });
  }

  if (!actor) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const allowedRoutes = getAllowedRoutes(actor.role);
  const defaultRoute = allowedRoutes[0] ?? '/login';
  const activeMainModule = useMemo(() => {
    if (location.pathname.startsWith('/employees')) return 'employees';
    if (location.pathname.startsWith('/leave')) return 'leave';
    if (location.pathname.startsWith('/recruitment')) return 'recruitment';
    if (location.pathname.startsWith('/administration')) return 'administration';
    return 'employees';
  }, [location.pathname]);

  const subModuleItems = useMemo(() => {
    const map: Record<string, Array<{ label: string; path: string }>> = {
      employees: [
          { label: t('subMenu.employees.profile'), path: '/employees?view=profile' },
          { label: t('subMenu.employees.departments'), path: '/employees?view=departments' },
          { label: t('subMenu.employees.teams'), path: '/employees?view=teams' },
        { label: t('subMenu.employees.contract'), path: '/employees?view=contract' },
        { label: t('subMenu.employees.performance'), path: '/employees?view=performance' },
      ],
      leave: [
        { label: t('subMenu.leave.request'), path: '/leave?view=request' },
        { label: t('subMenu.leave.approval'), path: '/leave?view=approval' },
        { label: t('subMenu.leave.balance'), path: '/leave?view=balance' },
        { label: t('subMenu.leave.policy'), path: '/leave?view=policy' },
      ],
      recruitment: [
        { label: t('subMenu.recruitment.positions'), path: '/recruitment?view=positions' },
        { label: t('subMenu.recruitment.candidates'), path: '/recruitment?view=candidates' },
        { label: t('subMenu.recruitment.pipeline'), path: '/recruitment?view=pipeline' },
        { label: t('subMenu.recruitment.interview'), path: '/recruitment?view=interview' },
      ],
      administration: [],
    };

    return map[activeMainModule];
  }, [activeMainModule, t]);

  const adminSubModuleGroups = useMemo(() => {
    return [
      {
        key: 'job',
        label: t('subMenu.administrationGroups.job'),
        items: [
          { label: t('subMenu.administration.jobTitle'), path: '/administration?view=job-title' },
          { label: t('subMenu.administration.employeeStatus'), path: '/administration?view=employee-status' },
          { label: t('subMenu.administration.jobCategories'), path: '/administration?view=job-categories' },
        ],
      },
      {
        key: 'access',
        label: t('subMenu.administrationGroups.access'),
        items: [
          { label: t('subMenu.administration.roleMatrix'), path: '/administration?view=role-matrix' },
          { label: t('subMenu.administration.userRoles'), path: '/administration?view=user-roles' },
          { label: t('subMenu.administration.accessScope'), path: '/administration?view=access-scope' },
          { label: t('subMenu.administration.audit'), path: '/administration?view=audit' },
        ],
      },
    ];
  }, [t]);

  const activeSubmodulePath = useMemo(() => {
    if (location.search) {
      return `${location.pathname}${location.search}`;
    }

    const defaultPaths = {
      employees: '/employees?view=profile',
      leave: '/leave?view=request',
      recruitment: '/recruitment?view=positions',
      administration: '/administration?view=job-title',
    };

    return defaultPaths[activeMainModule];
  }, [activeMainModule, location.pathname, location.search]);

  return (
    <div className={`app-shell ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <aside className="sidebar">
        {/* Toggle Button Overlapping Edge */}
        <button className="sidebar-collapse-btn" onClick={toggleSidebar} title={isSidebarExpanded ? t('app.collapseMenu') : t('app.expandMenu')}>
          {isSidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="sidebar-top">
          <div className="brand-wrap">
            <Building className="brand-icon" size={24} />
            {isSidebarExpanded && <span className="brand-text">Phần Mềm Quản Lý NS</span>}
          </div>
          
          <div className="user-profile">
            <div className="avatar-wrap">
              <img
                src={`https://ui-avatars.com/api/?name=${actor.fullName}&background=f3f4f6&color=ff7b25&rounded=true&size=128`}
                alt="Avatar"
                className="avatar"
              />
              <button className="settings-btn" title={t('app.settings', 'Cài đặt')}>
                <Settings size={14} />
              </button>
            </div>
            <div className="user-info">
              <p className="user-name">{actor.fullName}</p>
              <p className="user-role">{actor.role}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {availableNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {item.icon}
              <span className="sidebar-text">{item.label}</span>
            </NavLink>
          ))}
          {availableNavItems.length === 0 && (
            <div className="sidebar-no-results">
              <span className="sidebar-text">{t('app.noSearchResults')}</span>
            </div>
          )}
        </nav>

        <div className="sidebar-actions">
          <button
            className="ghost-btn icon-btn"
            title={t('app.switchLanguage')}
            onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
          >
            <Globe size={20} />
            <span className="sidebar-text">{t('app.switchLanguage')}</span>
          </button>

          <button className="ghost-btn icon-btn" title={t('app.logout')} onClick={logout}>
            <LogOut size={20} />
            <span className="sidebar-text">{t('app.logout')}</span>
          </button>
        </div>
      </aside>

      <div className="layout">
        <header className="header">
          <div className="header-left">
            <h1>{t('app.title')}</h1>
          </div>
        </header>

        <section className="submodule-menu" aria-label={t('subMenu.title')}>
          {activeMainModule === 'administration' ? (
            <div className="admin-submenu-groups">
              {adminSubModuleGroups.map((group) => {
                const isOpen = openAdminGroup === group.key;
                const isActiveGroup = group.items.some((item) => item.path === activeSubmodulePath);
                return (
                  <div key={group.key} className="admin-submenu-group">
                    <button
                      type="button"
                      className={`admin-submenu-trigger ${isActiveGroup ? 'active' : ''}`}
                      onClick={() => setOpenAdminGroup((current) => (current === group.key ? null : group.key))}
                    >
                      {group.label}
                      <ChevronDown size={14} className={`admin-submenu-chevron ${isOpen ? 'open' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="admin-submenu-dropdown">
                        {group.items.map((item) => (
                          <button
                            key={item.path}
                            type="button"
                            className={`admin-submenu-item ${activeSubmodulePath === item.path ? 'active' : ''}`}
                            onClick={() => {
                              navigate(item.path);
                              setOpenAdminGroup(null);
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="submodule-menu-list">
              {subModuleItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className={`submodule-pill ${activeSubmodulePath === item.path ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            <Route path="/login" element={<Navigate to={defaultRoute} replace />} />
            <Route
              path="/employees"
              element={
                canAccessEmployees(actor.role) ? (
                  <EmployeesPage />
                ) : (
                  <AccessDeniedPage fallbackPath={defaultRoute} />
                )
              }
            />
            <Route
              path="/leave"
              element={
                canAccessLeave(actor.role) ? (
                  <LeavePage />
                ) : (
                  <AccessDeniedPage fallbackPath={defaultRoute} />
                )
              }
            />
            <Route
              path="/recruitment"
              element={
                canAccessRecruitment(actor.role) ? (
                  <RecruitmentPage />
                ) : (
                  <AccessDeniedPage fallbackPath={defaultRoute} />
                )
              }
            />
            <Route
              path="/administration"
              element={
                canAccessAdministration(actor.role) ? (
                  <AdministrationPage />
                ) : (
                  <AccessDeniedPage fallbackPath={defaultRoute} />
                )
              }
            />
            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
