import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { IntlProvider } from "react-intl";
import { getLocale, getTranslations } from "./utils";

export function I18nProvider({ children }) {
  const isTest = process.env.NODE_ENV === 'test';
  // En test fijamos locale directamente para evitar ejecuciones memo innecesarias
  const locale = isTest ? 'en' : useMemo(getLocale, []);
  // En test arrancamos con mensajes vacíos y no ejecutamos carga async
  const [messages, setMessages] = useState(isTest ? {} : undefined);

  useEffect(() => {
    if (isTest) return; // no cargar traducciones en tests
    let mounted = true;
    getTranslations(locale).then(m => { if (mounted) setMessages(m); });
    return () => { mounted = false; };
  }, [isTest, locale]);

  if (!messages) {
    return <div></div>; // loading real (no test)
  }

  return (
    <IntlProvider defaultLocale="en" locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
}

I18nProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
