import { Routes } from '@angular/router';
import {LoginComponent} from "./components/login/login.component";
import {inject} from "@angular/core";
import {AuthService} from "./auth.service";
import {HomeComponent} from "./components/home/home.component";
import {DepartmentlistComponent} from "./components/departmentlist/departmentlist.component";

export const routes: Routes = [
  {
    path: "",
    component: HomeComponent,
    canActivate: [()=> inject(AuthService).isAuthenticated()]
  },
  {
    path: "login",
    component: LoginComponent
  },
  {
    path: "departmentlist",
    component: DepartmentlistComponent,
    canActivate: [()=> inject(AuthService).isAuthenticated()]
  }
];
