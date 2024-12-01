import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {Token} from "../../models/Token";
import {UserLoginModel} from "../../models/UserLoginModel";
import {Response} from "../../models/Response";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  constructor(private http: HttpClient,
              private router: Router
  ){

  }

  userLoginModel = new UserLoginModel();

  login(email: string, password: string) {
    this.userLoginModel.email = email;
    this.userLoginModel.password = password;

    console.log(this.userLoginModel);
    this.http.post<Response<Token>>("https://localhost:7187/v1/auth/login", this.userLoginModel)
      .subscribe({
        next: (res) => {
            console.log(res);
            localStorage.setItem("accessToken", JSON.stringify(res.data.accessToken));
            localStorage.setItem("refreshToken", JSON.stringify(res.data.refreshToken));
            this.router.navigateByUrl("/");
        },
        error: (error) => {
          console.error('An error occurred:');
        }
      });
  }


}

