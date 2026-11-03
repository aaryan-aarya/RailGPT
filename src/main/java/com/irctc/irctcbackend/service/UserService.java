package com.irctc.irctcbackend.service;

import com.irctc.irctcbackend.config.JwtUtil;
import com.irctc.irctcbackend.entity.User;
import com.irctc.irctcbackend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;


    // ✅ REGISTER
    // ✅ REGISTER
    public User registerUser(User user) {

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        return userRepository.save(user);
    }

    // ✅ GENERATE TOKEN
    public String generateToken(String email) {
        return jwtUtil.generateToken(email);
    }
    // ✅ LOGIN

    public String loginUser(String email, String password) {

        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid Password");
        }

        return jwtUtil.generateToken(email);
    }
    // ✅ CREATE
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    // ✅ GET ALL
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ✅ GET BY ID
    public User getUserById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    // ✅ UPDATE
    public User updateUser(Long id, User user) {
        user.setId(id);
        return userRepository.save(user);
    }

    // ✅ DELETE
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}