# Wider

Wider has been implemented to support a novel JavaScript on type formatting approach featuring an expanded layout aimed at enhancing readability. Specifically tailored for JavaScript coders who prefer:

- Utilizing ternaries and short circuits for conditional evaluations instead of employing traditional constructs such as `if-then-else` or `switch-case`.
- Opting for arrow functions over classical function declarations.
- Employing parentheses and the comma operator in lieu of curly braces.
- Adopting a comma-first object / array layout.
- Opting for chaining promises over async-await.
- Employing deep indentation for classical functions.

It is acknowledged that some coders may initially find the wider code formatting style unfamiliar, and a few may encounter challenges in grasping its rationale. Nevertheless, embracing this formatting approach will reveal its convenience, leading to potential enjoyment. Additionally, it is worth noting that the optimal viewing experience for wider JavaScript code is attained with the aid of an ultrawide monitor and the [Wide Github](https://chromewebstore.google.com/detail/wide-github/kaalofacklcidaampbokdplbklpeldpj?pli=1) Chrome/Firefox browser extension. This combination ensures that the resulting code is displayed in the most suitable fashion.

The initial release of Wider aims to fulfill the basic requirements set forth by the project's creator. However, in addition to maintenance, future releases will be implemented as the need for new functionalities arises.  Please feel free to request additional features that you think would complement the package effectively.

## Features

The current functionalities of Wider are as follows;

- ### Simple Ternary

**Simple Ternary** is the one that we know best. Entering colon (`:`) moves it to the last question mark's (`?`) indent on the next line.

<p align="center">
  <img src="./images/simple_ternary.gif" alt="simple_ternary">
</p>

- ### Nested Ternary

**Nested Ternary** is about narowing multiple but dependent conditions into a single resolution. Such as in pseudo code  `if x === 1 and y === 0 then doSomeThingA()` but `if x === 1 and y !== 0 then doSomeThingB()` however `if !== 1 then doSomethingC()` and assign the result to `a`. Entering colon (`:`) moves it to the last unmatched question mark's (`?`) indent on the next line.

<p align="center">
  <img src="./images/nested_ternary.gif" alt="nested_ternary">
</p>

- ### Switching Ternary

**Switching Ternary** is similar to the `Switch - Case` abstraction but much more powerful because we are not limited to switching between the results of a single test. It's about resolving multiple but independent conditions. For example, in pseudocode, `if x === 1 then doSomethingA()`, `if y === 0 then doSomethingB()`, `if z === 2 then doSomethingC()` and assign the result to `a`. Entering colon (`:`) moves it to the last unmatched question mark's (`?`) indent on the next line.

<p align="center">
  <img src="./images/switch_ternary.gif" alt="switch_ternary">
</p>

- ### Comma First Objects

If a space is placed after the first curly bracket, Wider Auto adopts a comma-first layout for object structures when a comma is entered at the end of the line. It's important to note that the **Auto Closing Brackets** option of the VSCode editor should be active and you should be typing between the brackets. Note that when activated, Wider will attempt to set the **Auto Closing Brackets** option to `"always"`.

<p align="center">
  <img src="./images/comma-first_object.gif" alt="comma-first_object">
</p>

- ### Comma First Expression Sequencing / Arguments

When the [comma operator (,)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Comma_operator) is used for sequencing expressions or to separate function arguments. The comma-first layout scheme enhances the readability of the code especially with ternary based conditionals or with stacked method chains. In function arguments you may still benefit from this functionality if your arguments are long or expressions by themselves.

If a space is placed right after the opening left bracket, Wider automatically adopts the comma-first layout mode for expression sequencing. This takes effect when a comma is added at the end of the line. It's important to note that the **Auto Closing Brackets** option of the VSCode editor should be active and you should be typing between the brackets. Also note that when activated, Wider will attempt to set the **Auto Closing Brackets** option in the VSCode editor settings to `"always"`.

<p align="center">
  <img src="./images/comma-first_expressions.gif" alt="comma-first_expressions">
</p>

- ### Stacked Method Chaining

Wider demonstrates a high proficiency in stacked method chaining, especially in contexts similar to JavaScript (JS) Promises, particularly when used in conjunction with **Comma First Expression Sequencing**. In the domain of Promises and other concepts centered around method chaining, the imperative nature of stacked method chaining becomes pivotal. It's important to note that Wider's functionality for **stacked method chaining** doesn't stack properties and is only effective when methods are immediately followed by a period.

<p align="center">
  <img src="./images/stacked_method_chaining.gif" alt="comma-first_expressions">
</p>

- ### Deep Indented Functions

Wherever a classical function declaration is on the line, its body gets indented 2 spaces relative to the start of the "function" keyword. This method of indentation isolates the function clearly from the rest of the code, avoiding the need to search for closing curly brackets. The usefulness of **Deep Indented Functions** is particularly evident when classically defined functions are used as callbacks or within **Comma-First Expression Sequencing**.

<p align="center">
  <img src="./images/deep_indented_function.gif" alt="comma-first_expressions">
</p>

## Requirements

Wider has no dependencies.

## Extension Settings

By default, the aforementioned features are enabled, but you have the flexibility to disable them individually through the settings menu, and the changes will take effect immediately.

* `wider.commaFirstLayout`: Enable/disable comma-first style for objects alongside paranthesised comma-first style for expression sequencing / arguments.
* `wider.deepIndentedFunctions`: Enable/disable deep indentation for classical functions.
* `wider.stackedMethodChaining`: Enable/disable stacked method chaining.
* `wider.ternaryFormatting`: Enable/disable ternary formatting.

## Known Issues

No known issues.

## Release Notes

### 0.0.1

Initial release.

### 0.0.2

Added comma-first suport for .json files

See the [CHANGELOG](https://github.com/kedicesur/wider/blob/master/CHANGELOG.md) file for details.

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/kedicesur/wider/blob/master/LICENSE) file for details.

