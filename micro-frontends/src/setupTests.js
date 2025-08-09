// mock the fetch global using jest
require("jest-fetch-mock").enableMocks();
require('@testing-library/jest-dom');

// default fetch mock para evitar TypeError en componentes que consumen fetch
beforeEach(() => {
  fetch.resetMocks();
  fetch.mockResponse(JSON.stringify({ entry: [] }));
});

jest.mock("./next-ui/Components/i18n/utils");