import React, {useEffect} from "react";
import PropTypes from "prop-types";
import "../../../styles/carbon-conflict-fixes.scss";
import "../../../styles/carbon-theme.scss";
import "../../../styles/common.scss";
import "../formDisplayControl/formDisplayControl.scss";


import {I18nProvider} from "../../Components/i18n/I18nProvider";
import {FormattedMessage} from "react-intl";


/** NOTE: for reasons known only to react2angular,
 * any functions passed in as props will be undefined at the start, even ones inside other objects
 * so you need to use the conditional operator like props.hostApi?.callback even though it is a mandatory prop
 */

export function VacunasDisplayControl(props) {

    useEffect(() => {
        console.log("VacunasDisplayControl montado");
        buildVacunasData();
    }, []);

    const buildVacunasData = () => {
        console.log(props)

    }
    const formsHeading = (
        <FormattedMessage
            id={"DASHBOARD_TITLE_VACUNAS_KEY"}
            defaultMessage={"Vacunas"}
        />
    );
    const loadingMessage = (
        <FormattedMessage
            id={"LOADING_MESSAGE"}
            defaultMessage={"Loading... Please Wait"}
        />
    );

    return (
        <>
            <I18nProvider>
                <div>
                    <h2 className={"forms-display-control-section-title"}>
                        {formsHeading}
                    </h2>
                    <div className="loading-message">{loadingMessage}</div>
                </div>

            </I18nProvider>
        </>
    );
}

VacunasDisplayControl.propTypes = {
    hostData: PropTypes.object.isRequired,
    hostApi: PropTypes.object.isRequired
};
