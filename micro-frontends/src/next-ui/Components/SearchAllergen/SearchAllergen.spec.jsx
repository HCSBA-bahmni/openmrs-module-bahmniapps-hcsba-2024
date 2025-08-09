import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { SearchAllergen } from "./SearchAllergen.jsx";
import { IntlProvider } from 'react-intl';

const renderWithIntl = (ui) => render(<IntlProvider locale="en">{ui}</IntlProvider>);

describe("SearchAllergen", function () {
  const onChange = jest.fn();
  const mockAllergensData = [
    { name: "Eggs", kind: "Food", uuid: "162301AAAAAA" },
    { name: "Peanuts", kind: "Food", uuid: "162302AAAAAA" },
    { name: "Seafood", kind: "Food", uuid: "162303AAAAAA" },
    { name: "Bee", kind: "Environment", uuid: "162304AAAAAA" },
    { name: "Serum", kind: "Biological", uuid: "162305AAAAAA" },
    { name: "Penicillin", kind: "Medication", uuid: "162306AAAAAA" },
    { name: "Narcotic agent", kind: "Medication", uuid: "162307AAAAAA" },
  ];

  it("should render SearchAllergen", function () {
    renderWithIntl(<SearchAllergen onChange={onChange} allergens={mockAllergensData} />);
    expect(screen.getByRole('searchbox', { name: /Search Allergen/i})).toBeInTheDocument();
    // Hay más de un nodo con este texto (heading y label); validamos que exista al menos uno
    expect(screen.getAllByText(/Search Allergen/i).length).toBeGreaterThan(0);
  });

  it("should render SearchAllergen with search bar", function () {
    const { container } = renderWithIntl(
      <SearchAllergen onChange={onChange} allergens={mockAllergensData} />
    );
    expect(container.querySelector(".bx--search--xl")).not.toBeNull();
  });
  it("should show allergens based on the key typed", function () {
    const { container } = renderWithIntl(
      <SearchAllergen onChange={onChange} allergens={mockAllergensData} />
    );
    const searchInput = container.querySelector(".bx--search-input");
    fireEvent.change(searchInput, { target: { value: "pea" } });
    const tag = container.querySelector(".bx--tag");
    expect(tag).not.toBeNull();
    expect(screen.getByText("Peanuts")).not.toBeNull();
    expect(tag.textContent).toEqual("Food");
    expect(() => screen.getByText("Milk")).toThrowError();
  });
  it("should show no allergens found when search result is empty", function () {
    const { container } = renderWithIntl(
      <SearchAllergen onChange={onChange} allergens={[]} />
    );
    const searchInput = container.querySelector(".bx--search-input");
    fireEvent.change(searchInput, { target: { value: "xyz" } });
    expect(screen.getByText("No Allergen found")).not.toBeNull();
  });
  it("should not show No Allergen message when the search query is empty", function () {
    const { container } = renderWithIntl(
      <SearchAllergen onChange={onChange} allergens={mockAllergensData} />
    );
    const searchInput = container.querySelector(".bx--search-input");
    fireEvent.change(searchInput, { target: { value: "xyz" } });
    expect(screen.getByText("No Allergen found")).not.toBeNull();

    //clear search query
    fireEvent.change(searchInput, { target: { value: "" } });
    expect(() => screen.getByText("No Allergen found")).toThrowError();
  });
  it("should not show No Allergen message when we clear the search query", function () {
    const { container } = renderWithIntl(
      <SearchAllergen onChange={onChange} allergens={mockAllergensData} />
    );
    const searchInput = container.querySelector(".bx--search-input");
    fireEvent.change(searchInput, { target: { value: "xyz" } });
    expect(screen.getByText("No Allergen found")).not.toBeNull();

    //clear search query
    const searchBarCloseIcon = container.querySelector(".bx--search-close");
    fireEvent.click(searchBarCloseIcon);
    expect(() => screen.getByText("No Allergen found")).toThrowError();
  });
  it('should call onChange function when an allergen is clicked', function () {
    const { container } = renderWithIntl(
        <SearchAllergen onChange={onChange} allergens={mockAllergensData} />
    );

    const searchInput = container.querySelector('.bx--search-input');
    fireEvent.change(searchInput, { target: { value: 'nu' } });

    const allergen = screen.getByText('Peanuts');
    fireEvent.click(allergen);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
        name: 'Peanuts',
        kind: 'Food',
        uuid: '162302AAAAAA'
    });
  });
});
