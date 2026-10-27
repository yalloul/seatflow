import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { Role } from "./models";

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.user())
    return router.createUrlTree(["/login"], {
      queryParams: { returnUrl: state.url },
    });
  const roles = route.data["roles"] as Role[] | undefined;
  return (
    !roles || auth.hasRole(...roles) || router.createUrlTree(["/forbidden"])
  );
};
