# IpsDisplayControl - Micro Frontend React

Este documento describe cómo se crea, registra y utiliza el componente `IpsDisplayControl` como micro frontend en el ecosistema Bahmni, integrando React y Angular.

## 1. Definición del componente

El componente principal se encuentra en:
```
micro-frontends/src/next-ui/Containers/ips/ipsDisplayControl.jsx
```

`IpsDisplayControl` es un componente React que recibe datos y funciones desde Angular a través de los props `hostData` y `hostApi`.

## 2. Registro en el micro frontend

En el archivo:
```
micro-frontends/src/next-ui/index.js
```
se importa y registra el componente usando el builder `React2AngularBridgeBuilder`:

```js
import { IpsDisplayControl } from "./Containers/ips/ipsDisplayControl";
...
builder.createComponentWithTranslationForwarding(
    "IpsDisplayControl",
    IpsDisplayControl
);
```

Esto expone el componente como un micro frontend bajo el nombre `mfe-next-ui-ips-display-control` para ser utilizado en Angular.

## 3. Módulo Angular

El componente se registra en el módulo Angular `bahmni.mfe.nextUi`, permitiendo su uso en las vistas de Angular mediante la etiqueta personalizada:

```html
<mfe-next-ui-ips-display-control host-data="ipsData" host-api="ipsApi"></mfe-next-ui-ips-display-control>
```

## 4. Props esperados

- `hostData`: Objeto con datos del paciente, por ejemplo:
  ```js
  {
    patientUuid: "uuid-del-paciente",
    identifier: "identificador-del-paciente"
  }
  ```
- `hostApi`: Objeto con funciones, por ejemplo:
  ```js
  {
    ipsService: {
      generateDocument: (patientUuid, identifier) => { ... }
    }
  }
  ```

## 5. Lógica interna

- El componente consulta documentos clínicos usando el identificador del paciente (ITI-67).
- Permite generar nuevos documentos IPS usando la función `generateDocument` recibida por `hostApi`.
- Toda la lógica de consulta y renderizado está en React; Angular solo provee los datos y las funciones necesarias.

## 6. Ventajas

- Permite desacoplar la lógica de negocio y presentación de Angular.
- Facilita la reutilización y evolución del componente React sin modificar Angular.

---

## 7. Uso en Angular

En el archivo de vista:
```
ui/app/common/displaycontrols/dashboard/views/sections/nextUISection.html
```
El componente se utiliza así:
```html
<mfe-next-ui-ips-display-control
    ng-if="::(section.type === 'ipsReact')"
    host-data="ipsData"
    host-api="ipsApi"
    app-service="appService">
</mfe-next-ui-ips-display-control>
```
Esto asegura que el micro frontend solo se renderiza cuando `section.type` es igual a `"ipsReact"`.

## 8. Construcción de datos y API en Angular

En el archivo:
```
ui/app/common/displaycontrols/dashboard/directives/dashboard.js
```
Se definen los objetos que se pasan al micro frontend:

```js
// 1) Se resuelve el identificador preferido del paciente
var preferredIdentifier =
    ($scope.patient.primaryIdentifier && $scope.patient.primaryIdentifier.identifier) ||
    $scope.patient.identifier ||
    (($scope.patient.identifiers && $scope.patient.identifiers.length > 0) ? $scope.patient.identifiers[0].identifier : null);

// 2) Datos para el MFE IPS
$scope.ipsData = {
    patientUuid: $scope.patient.uuid,
    identifier: preferredIdentifier
    // Puedes agregar más datos si lo necesitas
};

// 3) API (callbacks) opcional para el MFE
$scope.ipsApi = {
    refresh: function () {
        // Recarga desde Angular si el MFE lo solicita
    },
    onOpenDoc: function (docId) {
        // Callback al abrir un documento IPS
    }
};
```

## 9. Reconocimiento de section.type

El valor `section.type` se utiliza en la lógica de Angular para decidir qué micro frontend mostrar. Para el IPS, debe ser `"ipsReact"`. Esto permite que el sistema sea extensible y configurable para otros micro frontends.

## 10. Declaración de section.type en el dashboard

Para que el tipo de sección (`section.type`) sea reconocido y renderice el micro frontend de React, debe estar declarado en el array `reactDisplayControls` dentro del archivo:
```
ui/app/common/displaycontrols/dashboard/models/dashboardSection.js
```
Por ejemplo:
```js
var reactDisplayControls = [
    "allergies",
    "formsV2React",
    "vacunasReact",
    "ipsReact" // <--- aquí se declara el tipo para IPS
];
```

Cuando el sistema detecta que `section.type` es uno de los valores en `reactDisplayControls`, renderiza el micro frontend correspondiente usando la vista `nextUISection.html`.

Si quieres agregar un nuevo micro frontend, solo añade su nombre a este array.

---

Para más detalles, revisa el código fuente en la ruta indicada y el archivo de registro del micro frontend.
