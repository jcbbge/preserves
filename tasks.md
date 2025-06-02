# Task Management

| ID | Task | Status | Feature | Description |
|----|------|--------|---------|-------------|
| T1 | Refactor Aftermath | Done | Performance | Application was refactored to apply SolidJS patterns, remove dead code, optimize reactivity, and improve performance. Need to start the app and test it thoroughly. Breaking changes may have occurred as we updated architecture and patterns of the application.
| T2 | Polaroid Component "Exposure" Animation | Todo | Design | Create a playground for an easy and intuitive way to create animation settings for the Polaroid component
| T3 | LoginComponent needs to tab to button polaroid for accessiblity | Done | Accessibility | Following standard html structure and accessibility guidelines, ensure that the login component is accessible and can be navigated using keyboard only.
| T4 | Increase 'spread' of polaroid photos for both index stock images and dashboard peach images | Done | Design | Adjust the stored settings for default placements of polaroid photos. currently then are arranged in a circular pattern around the LoginComponent and DashboardNav so this is only a minor change to the default settings to increase the spread of the polaroid photos.
| T5 | Disable password manager autocomplete on login form | Done | UX | Add autocomplete="off" or autocomplete="new-password" to prevent password manager modals from appearing during login flow.
| T6 | Fix DashboardNav image aspect ratio cropping | Done | Design | Dashboard component image appears cropped with wide margins on left/right sides instead of displaying as full 1:1 ratio image.
| T7 | Remove ghosting border effect on DashboardNav drag | Done | Design | DashboardNav shows unwanted border around login-container div when mouse down/dragging. Should match LoginComponent drag behavior without visual artifacts.
| T8 | No post found error message on Dashboard | Done | Design | When dashboard is loading, display message shows no posts found--however, that is an anti-pattern and disruptive to the user experience. What is actually happening is that the dashboard is loading and no posts have been found yet. We need to display a message that says "Loading..." until the dashboard has finished loading.
| T9 | Canvas defaults are not getting reset | Done | Design | The canvas needs to reset to 100% view and centered. it doesnt alway seem to reset when refreshing the page even after clearing localstoreage.
| T10 | Hitting Return or Enter key should submit index login form. | Review | Accessibility | If tab focus element is a 'button', then hitting the return / enter key should trigger the handler.
| T11 | dashboardNav component not displaying correct user info | Todo | Design | user avatar should be displayed and the users bio should be displayed as the caption.
