import axios from "axios";
import {ENCOUNTER_BASE_URL} from "../../constants";
import {build} from "../FormDisplayControl/BuildFormView";
import {formatDate} from "../../utils/utils";
import {getFormDetail} from "../../Components/EditObservationForm/EditObservationFormUtils";

export const findByEncounterUuid = async (encounterUuid) => {
    const apiURL = ENCOUNTER_BASE_URL.replace("{encounterUuid}", encounterUuid);
    const params = {
        includeAll: false,
    };
    try {
        const response = await axios.get(apiURL, {params});
        if (response.status === 200) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error("error -> ", error);
    }
};

var getFormNameAndVersion = function (path) {
    var formNameAndVersion = path.split("/")[0].split(".");
    return {
        formName: formNameAndVersion[0],
        formVersion: formNameAndVersion[1],
    };
};

export const buildFormMap = async (formMap) => {
    var encounter = await findByEncounterUuid(formMap.encounterUuid);

    //usar esto apra traer detalle del formulario
    var detalleFormResponse = await getFormDetail(formMap.formUuid)


    var observationsForSelectedForm = [];
    // se añadio el detalle del formulario para poder obtener los labels creados al momento de crear el formulario
    var formDetailsAsString = detalleFormResponse?.resources[0]?.value || "{}";
    const formDetails = JSON.parse(formDetailsAsString) || {};
    const controls = formDetails.controls || [];
    encounter.observations.forEach(function (obs) {
        if (obs.formFieldPath) {
            var obsFormNameAndVersion = getFormNameAndVersion(obs.formFieldPath);
            if (obsFormNameAndVersion.formName === formMap.formName) {

                const matchingControl = controls.find(
                    ctrl => ctrl.concept && ctrl.concept.uuid === obs.concept.uuid
                ) || {};
                // se añade el label del control al objeto de observación
                observationsForSelectedForm.push({
                    ...obs,
                    formUuid: formMap.formUuid,
                    label: matchingControl?.label?.value || obs.concept.name
                });
            }
        }
    });

    return await build(
        [{value: observationsForSelectedForm}],
        formMap.hasNoHierarchy
    );
};

export const subLabels = (subItem) => {
    let label = "";
    const {lowNormal, hiNormal} = subItem;
    if (lowNormal && hiNormal) {
        label = `(${lowNormal} - ${hiNormal})`;
    } else if (lowNormal && !hiNormal) {
        label = `(>${lowNormal})`;
    } else if (!lowNormal && hiNormal) {
        label = `(<${hiNormal})`;
    }
    return label;
};

export const isAbnormal = (interpretation) =>
    interpretation && interpretation.toUpperCase() === "ABNORMAL";

export const memberTypes = {
    DATE: "Date",
    DATETIME: "Datetime",
    COMPLEX: "Complex",
    BOOLEAN: "Boolean",
};
export const getValue = (member) => {
    const {value = "", type, complexData = {}, valueAsString} = member;
    let finalValue = value?.shortName || value;
    switch (type) {
        case memberTypes.DATE:
            finalValue = formatDate(finalValue, "DD MMM YY");
            break;
        case memberTypes.DATETIME:
            finalValue = formatDate(finalValue, "DD MMM YY hh:mm a");
            break;
        case memberTypes.COMPLEX:
            finalValue = complexData?.display || finalValue;
            break;
        case memberTypes.BOOLEAN:
            finalValue = valueAsString;
            break;
    }
    return finalValue;
};

export const isValidFileFormat = (item) => {
    const fileFormats = [
        "video/mp4",
        "image/png",
        "image/jpeg",
        "application/pdf",
    ];
    const mimeType = item?.complexData?.mimeType;
    if (fileFormats.includes(mimeType)) return true;
    return false;
};

export const getThumbnail = (src, extension = undefined) => {
    if (extension) {
        return (
            (src && src.replace(/(.*)\.(.*)$/, "$1_thumbnail." + extension)) || null
        );
    }
    return (src && src.replace(/(.*)\.(.*)$/, "$1_thumbnail.$2")) || null;
};

export const doesUserHaveAccessToTheForm = (privileges, data, action) => {
    if (
        typeof data.privileges != "undefined" &&
        data.privileges != null &&
        data.privileges.length > 0
    ) {
        var editable = [];
        var viewable = [];
        data.privileges.forEach((formPrivilege) => {
            const matchedPrivilege = privileges.find((privilege) => {
                return privilege.name === formPrivilege.privilegeName;
            });
            if (matchedPrivilege) {
                if (action === "edit") {
                    editable.push(formPrivilege.editable);
                } else {
                    viewable.push(formPrivilege.viewable);
                }
            }
        });
        if (action === "edit") {
            if (editable.includes(true)) {
                return true;
            }
        } else {
            if (viewable.includes(true)) {
                return true;
            } else {
                return false;
            }
        }
    } else {
        return true;
    }
};
