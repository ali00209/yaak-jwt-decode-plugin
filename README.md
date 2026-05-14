# JWT Decode - Yaak Plugin

Decoding a JWT by hand — copying the token, heading to [jwt.io](https://jwt.io), pasting it in, and hunting for the claim you need — breaks your flow every single time. To make things simpler, I wrote this little plugin for the [Yaak](https://yaak.app/) API client which provides a template function to decode any JWT token and optionally filter the result using a JSONPath expression.

## Basic Usage

To use this plugin, proceed as follows:

1. In Yaak, go to `Settings > Plugins`, search for `JWT Decode` and hit `Install`.
2. Open any request and go to the tab where you need the decoded value (e.g. `Headers`, `Body`, or `Query`).
3. In the value field, start typing `jwt.decode` and select the corresponding function.
4. Click on the template and paste in your JWT token.
5. Optionally, provide a JSONPath expression (e.g. `$.data.login`) to extract a specific field.

That's it!
