## 2025-05-06 - Image Upload Refactoring
**Smell:** Duplicated logic for parsing files to Data URLs using `FileReader` and validating file size and type. It was found identically inside `LogoControls` and `BorderControls`.
**Remedy:** Extracted common image upload mechanics into `src/hooks/useImageUpload.ts`. This safely eliminates duplicated boilerplate while maintaining identical behavior. Kept tests tightly coupled with behavior validation.
