import { Component } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {DepartmentModel} from "../../models/DepartmentModel";
import {Response} from "../../models/Response";
import {NgForOf} from "@angular/common";
import * as signalR from "@microsoft/signalr";
import {UniversityModel} from "../../models/UniversityModel";
@Component({
  selector: 'app-departmentlist',
  standalone: true,
  imports: [
    NgForOf
  ],
  templateUrl: './departmentlist.component.html',
  styleUrl: './departmentlist.component.css'
})




export class DepartmentlistComponent {
  hub: signalR.HubConnection | undefined;
  departments: DepartmentModel[] = [];
  universities : UniversityModel[] = [];

  constructor(private http: HttpClient, private router: Router) {

    this.hub = new signalR.HubConnectionBuilder().withUrl("https://localhost:7187/toedurHub").build();
    this.hub.start().then(() => {

      console.log("Connection started");



      this.http.get<Response<DepartmentModel[]>>("https://localhost:7187/api/v1/storage/departments").subscribe(data => {
        this.departments = data.data;
        console.log(data.data)
      });

      this.http.get<Response<UniversityModel[]>>("https://localhost:7187/api/v1/storage/universities").subscribe(data => {
        this.universities = data.data;
        console.log(data.data)
      });


      this.hub?.on("NotifyDepartmentAdded", (department: DepartmentModel) => {
        console.log(department);
        this.departments.push(department);
      });

      this.hub?.on("NotifyUniversityAdded", (university: UniversityModel) => {
        console.log(university);
        this.universities.push(university);
      });

    }).catch(err => console.error("Error while starting connection: " + err));






  }

}
