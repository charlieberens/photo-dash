<script>
import axios from "axios";

export default {
  name: "IndexPage",
  data() {
    return {
      email: "",
      pw: "",
    };
  },
  methods: {
    async submit(e) {
      e.preventDefault();

      const res = await axios.post("/api/login", {
        email: this.email,
        pw: this.pw,
      });
      if (res.data.err) {
        console.log(res.data.err);
        alert(res.data.err);
      } else if (res.data.redirect) {
        window.location.href = res.data.redirect;
      }
    },
  },
  mounted() {
    async function checkToken() {
      document.cookie.split("token=")[1];
      const token = document.cookie.split("token=")[1];
      if (token) {
        const res = await axios.get("/api/validate?token=" + token);
        if (res.data.valid) {
          window.location.href = "/dashboard";
        }
      }
    }
    checkToken();
  },
};
</script>

<template>
  <div id="auth-page">
    <form id="auth-section" @submit="submit">
      <h2>Admin Login</h2>
      <div class="input-cont">
        <label for="email">Email</label>
        <input name="email" type="text" v-model="email" />
      </div>
      <div class="input-cont">
        <label for="password">Password</label>
        <input name="password" type="password" v-model="pw" />
      </div>
      <button>Login</button>
    </form>
  </div>
</template>

<style lang="scss"></style>

<style lang="scss" scoped>
#auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: $offwhite;
}
#auth-section {
  padding: 40px;
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid $grey-border;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  row-gap: 30px;
  max-width: 400px;
  width: 100%;
  background: white;
}
h2 {
  width: 100%;
}
.input-cont {
  width: 100%;
}
input {
  width: 100%;
  padding: 14px 15px;
  border: 1px solid $grey-border;
  outline: none;
  font-size: 100%;
  border-radius: 2px;

  &:focus {
    border-color: $text;
  }
}
label {
  margin-bottom: 10px;
  display: block;
}
</style>
