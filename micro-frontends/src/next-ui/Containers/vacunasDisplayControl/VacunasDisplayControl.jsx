import React, {useState, useEffect} from "react";
import PropTypes from "prop-types";
import axios from "axios";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "../formDisplayControl/formDisplayControl.scss";

import {I18nProvider} from "../../Components/i18n/I18nProvider";
import {FormattedMessage} from "react-intl";
import {Loading} from "carbon-components-react";

// Instancia AISLADA de axios para evitar que los interceptores globales de Bahmni
// intercepten los errores y muestren diálogos de error en la UI de Bahmni.
// eslint-disable-next-line no-unused-vars
const axiosVacunas = axios.create({ timeout: 60000 });

/** NOTE: for reasons known only to react2angular,
 * any functions passed in as props will be undefined at the start, even ones inside other objects
 * so you need to use the conditional operator like props.hostApi?.callback even though it is a mandatory prop
 */

export function VacunasDisplayControl(props) {
    const {hostData} = props;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [vacunas, setVacunas] = useState([]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // TODO: reemplazar con la URL real del API de vacunas
                // Ejemplo: const res = await axiosVacunas.get(`/url/vacunas?identifier=${hostData?.identifier}`);
                // if (!cancelled) setVacunas(res.data || []);
                if (!cancelled) setVacunas([]);
            } catch (e) {
                // Error silenciado: no propagar para evitar diálogos de Bahmni
                console.warn("[Vacunas] Error al cargar datos (silenciado):", e);
                if (!cancelled) setVacunas([]);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [hostData]);

    if (isLoading) {
        return (
            <I18nProvider>
                <div className="ips-display-control-loading">
                    <Loading
                        description={
                            <FormattedMessage id="LOADING_MESSAGE" defaultMessage="Loading... Please Wait"/>
                        }
                    />
                </div>
            </I18nProvider>
        );
    }

    if (error) {
        // Error silenciado: no mostrar nada para no interferir con la UI de Bahmni
        return null;
    }

    const formsHeading = (
        <FormattedMessage
            id={"DASHBOARD_TITLE_VACUNAS_KEY"}
            defaultMessage={"Vacunas"}
        />
    );

    return (
        <I18nProvider>
            <div>
                <h2 className={"forms-display-control-section-title"}>
                    {formsHeading}
                </h2>
                {vacunas.length === 0 ? (
                    <p className="empty-message">
                        <FormattedMessage id="NO_VACUNAS" defaultMessage="No hay vacunas registradas"/>
                    </p>
                ) : (
                    <div className="vacunas-list">
                        {/* Contenido de la lista de vacunas */}
                    </div>
                )}
            </div>
        </I18nProvider>
    );
}

VacunasDisplayControl.propTypes = {
    hostData: PropTypes.object.isRequired,
    hostApi: PropTypes.object.isRequired
};
